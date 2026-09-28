import { useState, useEffect, useCallback, useContext } from 'react'
import { encodeFunctionData, formatEther, formatUnits, getAddress, parseEther, parseUnits } from 'viem'
import {
  getContractBalance,
  getWalletClient,
  getBalance,
  sendRawTransaction,
  WalletContext,
  PUBLIC_CLIENT,
} from '../connector.tsx'
import { CONTRACTS } from '../config/contracts'
import { robinhood } from '../chains'

const LJB_TOKEN = getAddress(CONTRACTS.robinhood.ljbToken)
const LJB_DECIMALS = 18
const KYBERSWAP_API = 'https://aggregator-api.kyberswap.com/robinhood/api/v1'
const KYBER_CLIENT_ID = 'ai-agent-skills'
const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const ETH_GAS_BUFFER = parseEther('0.0005')
const SLIPPAGE_BPS = 100
const GAS_BUFFER_BPS = 110n
const BPS = 100n

interface TokenBalance { symbol: string; address: string; balance: bigint; decimals: number }
interface RouteData { amountOut: string; gasUsd: string; route: unknown; routeSummary: Record<string, any>; routerAddress: string }
const ERC20_ABI = [{ name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] }] as const
const errorText = (error: unknown) => error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)

export default function GetLjbTokens() {
  const { address, chainId, switchChain } = useContext(WalletContext)
  const [isOpen, setIsOpen] = useState(false)
  const [balances, setBalances] = useState<Record<string, TokenBalance>>({})
  const [selectedToken, setSelectedToken] = useState<'ETH' | 'USDG'>('ETH')
  const [amount, setAmount] = useState('')
  const [quoteResult, setQuoteResult] = useState<RouteData | null>(null)
  const [buttonText, setButtonText] = useState('Quote')
  const [isSwapping, setIsSwapping] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tokenConfig: Record<string, { address: string; decimals: number; isNative: boolean }> = {
    ETH: { address: NATIVE_TOKEN, decimals: 18, isNative: true },
    USDG: { address: getAddress(CONTRACTS.robinhood.stableCoin), decimals: 6, isNative: false },
  }

  const requireRobinhood = useCallback(async () => {
    if (chainId !== robinhood.id) await switchChain(robinhood.id)
  }, [chainId, switchChain])

  const fetchBalances = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      await requireRobinhood()
      const accounts = await getWalletClient(undefined, robinhood).getAddresses()
      if (!accounts[0]) throw new Error('Connect your wallet before loading balances')
      const walletAddress = getAddress(accounts[0])
      const [ethBalance, usdgBalance, ljbBalance] = await Promise.all([
        getBalance(walletAddress, robinhood),
        getContractBalance({ address: tokenConfig.USDG.address, abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }], functionName: 'balanceOf', args: [walletAddress], chain: robinhood }),
        getContractBalance({ address: LJB_TOKEN, abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }], functionName: 'balanceOf', args: [walletAddress], chain: robinhood }),
      ])
      setBalances({ ETH: { symbol: 'ETH', address: tokenConfig.ETH.address, balance: ethBalance, decimals: 18 }, USDG: { symbol: 'USDG', address: tokenConfig.USDG.address, balance: usdgBalance as bigint, decimals: 6 }, LJB: { symbol: 'LJB', address: LJB_TOKEN, balance: ljbBalance as bigint, decimals: LJB_DECIMALS } })
    } catch (err) { setError(errorText(err)) } finally { setLoading(false) }
  }, [requireRobinhood, tokenConfig.USDG.address])

  useEffect(() => { if (isOpen) void fetchBalances() }, [isOpen, fetchBalances])

  const fetchRoute = async (tokenKey: keyof typeof tokenConfig, amountHuman: string): Promise<RouteData> => {
    const tokenIn = tokenConfig[tokenKey]
    const amountWei = parseUnits(amountHuman, tokenIn.decimals).toString()
    const url = new URL(`${KYBERSWAP_API}/routes`)
    url.search = new URLSearchParams({ tokenIn: tokenIn.address, tokenOut: LJB_TOKEN, amountIn: amountWei, source: KYBER_CLIENT_ID }).toString()
    const response = await fetch(url, { headers: { 'X-Client-Id': KYBER_CLIENT_ID } })
    const raw = await response.text()
    let json: any
    try { json = JSON.parse(raw) } catch { throw new Error(`KyberSwap quote returned invalid JSON: ${raw.slice(0, 300)}`) }
    if (!response.ok || json.code !== 0) throw new Error(json.message || `KyberSwap quote failed: HTTP ${response.status}`)
    const routeSummary = json.data?.routeSummary
    if (!routeSummary) throw new Error('No route found')
    if (!routeSummary.amountOut || BigInt(routeSummary.amountOut) <= 0n) throw new Error('KyberSwap returned zero LJB output')
    const summaryRouter = getAddress(routeSummary.routerAddress ?? json.data.routerAddress)
    const outerRouter = getAddress(json.data.routerAddress ?? routeSummary.routerAddress)
    if (summaryRouter !== outerRouter) throw new Error(`KyberSwap router mismatch: ${summaryRouter} vs ${outerRouter}`)
    return { amountOut: routeSummary.amountOut, gasUsd: routeSummary.gasUsd ?? '0.00', route: routeSummary.route, routeSummary, routerAddress: summaryRouter }
  }

  const handleMax = () => { const bal = balances[selectedToken]; if (!bal) return; const spendable = selectedToken === 'ETH' ? (bal.balance > ETH_GAS_BUFFER ? bal.balance - ETH_GAS_BUFFER : 0n) : bal.balance; setAmount(selectedToken === 'ETH' ? formatEther(spendable) : formatUnits(spendable, bal.decimals)) }
  const handleQuote = async () => { if (!amount || Number(amount) <= 0) return; setError(null); setButtonText('Getting Quote...'); try { setQuoteResult(await fetchRoute(selectedToken, amount)); setButtonText('Swap') } catch (err) { setError(errorText(err)); setButtonText('Quote') } }
  const checkAllowance = async (owner: string, spender: string, token: string) => getContractBalance({ address: token, abi: [{ name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: 'value', type: 'uint256' }] }], functionName: 'allowance', args: [getAddress(owner), getAddress(spender)], chain: robinhood }) as Promise<bigint>

  const handleSwap = async () => {
    if (!quoteResult || !amount || !address) { setError('Connect wallet and get a quote first'); return }
    setIsSwapping(true); setError(null); setButtonText('Swapping...')
    try {
      await requireRobinhood()
      const user = getAddress(address)
      const tokenIn = tokenConfig[selectedToken]
      const amountWei = parseUnits(amount, tokenIn.decimals)
      const freshRoute = await fetchRoute(selectedToken, amount)
      setQuoteResult(freshRoute)

      if (!tokenIn.isNative) {
        const allowance = await checkAllowance(user, freshRoute.routerAddress, tokenIn.address)
        if (allowance < amountWei) {
          const approveData = encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [freshRoute.routerAddress as `0x${string}`, amountWei] })
          const approveTx = await sendRawTransaction({ account: user, to: getAddress(tokenIn.address), data: approveData, value: 0n, chain: robinhood })
          const approvalReceipt = await PUBLIC_CLIENT.waitForTransactionReceipt({ hash: approveTx as `0x${string}` })
          if (approvalReceipt.status !== 'success') throw new Error('Token approval reverted')
        }
      }

      const buildResponse = await fetch(`${KYBERSWAP_API}/route/build`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Id': KYBER_CLIENT_ID }, body: JSON.stringify({ routeSummary: freshRoute.routeSummary, sender: user, recipient: user, slippageTolerance: SLIPPAGE_BPS, deadline: Math.floor(Date.now() / 1000) + 600, source: KYBER_CLIENT_ID, enableGasEstimation: true }) })
      const buildRaw = await buildResponse.text()
      let buildJson: any
      try { buildJson = JSON.parse(buildRaw) } catch { throw new Error(`KyberSwap build returned invalid JSON: ${buildRaw.slice(0, 500)}`) }
      if (!buildResponse.ok || buildJson.code !== 0) throw new Error(buildJson.message || `Build failed: HTTP ${buildResponse.status}`)
      const tx = buildJson.data
      if (!tx?.routerAddress || !tx?.data) throw new Error('KyberSwap build returned an incomplete transaction')
      const routerAddress = getAddress(tx.routerAddress)
      const txData = tx.data as `0x${string}`
      const txValue = tx.transactionValue ? BigInt(tx.transactionValue) : 0n
      const walletChainId = await getWalletClient(user, robinhood).getChainId()
      if (walletChainId !== robinhood.id) throw new Error(`Wallet is on chain ${walletChainId}; expected ${robinhood.id}`)
      const nativeBalance = await getBalance(user, robinhood)
      const gasPrice = await PUBLIC_CLIENT.getGasPrice()
      const apiGas = tx.gas ? BigInt(tx.gas) : 0n
      const localGas = await PUBLIC_CLIENT.estimateGas({ account: user, to: routerAddress, data: txData, value: txValue })
      const baseGas = apiGas > localGas ? apiGas : localGas
      const gasLimit = (baseGas * GAS_BUFFER_BPS) / BPS
      const requiredBalance = txValue + gasLimit * gasPrice
      if (nativeBalance < requiredBalance) throw new Error(`Insufficient Robinhood ETH for swap value and gas. Required ${requiredBalance.toString()} wei; balance ${nativeBalance.toString()} wei.`)

      await PUBLIC_CLIENT.call({ account: user, to: routerAddress, data: txData, value: txValue })
      const hash = await sendRawTransaction({ account: user, to: routerAddress, data: txData, value: txValue, gas: gasLimit, chain: robinhood })
      const receipt = await PUBLIC_CLIENT.waitForTransactionReceipt({ hash: hash as `0x${string}` })
      if (receipt.status !== 'success') throw new Error(`KyberSwap swap reverted. Transaction: ${hash}`)
      setButtonText('Quote'); setQuoteResult(null); setAmount(''); await fetchBalances()
    } catch (err) { console.error(err); setError(errorText(err)); setButtonText('Swap') } finally { setIsSwapping(false) }
  }

  const toggleAccordion = () => { setIsOpen(prev => !prev); setError(null); setQuoteResult(null); setButtonText('Quote'); setAmount('') }
  return <div style={{ marginTop: '12px' }}><div onClick={toggleAccordion} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#C6FE00', fontWeight: 900, fontFamily: 'Rubik', fontSize: '14px' }}>{isOpen ? '▼' : '▶'} Get LJB Tokens</span><span style={{ color: '#fff', fontFamily: 'Rubik', fontSize: '12px' }}>Swap to LJB on Robinhood</span></div>{isOpen && <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>{loading && <span style={{ color: '#fff', fontSize: '12px' }}>Loading balances...</span>}<div style={{ display: 'flex', gap: '8px' }}>{(['ETH', 'USDG'] as const).map(token => <button key={token} className={`btn ${selectedToken === token ? 'btn-primary' : ''}`} onClick={event => { event.stopPropagation(); setSelectedToken(token); setQuoteResult(null); setButtonText('Quote') }} style={{ flex: 1 }}>{token}</button>)}</div><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><input type="number" className="input" placeholder="Amount" value={amount} onChange={event => { setAmount(event.target.value); setQuoteResult(null); setButtonText('Quote') }} style={{ flex: 1 }} /><button className="btn btn-primary" onClick={event => { event.stopPropagation(); handleMax() }} style={{ width: '130px', flexShrink: 0 }}>Max</button></div><div style={{ fontSize: '11px', color: '#fff', opacity: 0.6 }}>Balance: {balances.LJB ? Number(formatUnits(balances.LJB.balance, LJB_DECIMALS)).toFixed(6) : '0'} LJB</div>{quoteResult && <div className="panel" style={{ padding: '8px 12px' }}><strong>Quote:</strong> {formatUnits(BigInt(quoteResult.amountOut), LJB_DECIMALS)} LJB<br /><span style={{ fontSize: '11px', opacity: 0.7 }}>Gas: ~{quoteResult.gasUsd} USD</span></div>}{error && <div style={{ color: '#ff537b', fontSize: '12px' }}>{error}</div>}<button className="btn btn-primary" style={{ width: '100%' }} onClick={quoteResult ? handleSwap : handleQuote} disabled={isSwapping}>{buttonText}</button></div>}</div>
}