import { useState, useEffect, useCallback, useContext } from 'react'
import { formatEther, formatUnits, parseUnits, parseEther, encodeFunctionData } from 'viem'
import { getContractBalance, getWalletClient, getBalance, sendRawTransaction, WalletContext, PUBLIC_CLIENT } from '../connector.tsx'
import { CONTRACTS } from '../config/contracts'
import { robinhood } from '../chains'

const LJB_TOKEN = CONTRACTS.robinhood.ljbToken
const LJB_DECIMALS = 18 // adjust if LJB has different decimals
const KYBERSWAP_API = 'https://aggregator-api.kyberswap.com/robinhood/api/v1'
const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const ETH_GAS_BUFFER = parseEther('0.0005')

interface TokenBalance {
  symbol: string
  address: string
  balance: bigint
  decimals: number
}

interface RouteData {
  amountOut: string
  gasUsd: string
  route: any
  routeSummary: any
  routerAddress: string
}

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: 'success', type: 'bool' }],
  },
] as const

export default function GetLjbTokens() {
  const { address } = useContext(WalletContext)
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
    USDG: { address: CONTRACTS.robinhood.stableCoin, decimals: 6, isNative: false },
  }

  const fetchBalances = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const walletClient = getWalletClient()
      const accounts = await walletClient.getAddresses()
      const walletAddress = accounts[0] || '0x00000000000000000000000000000001'

      const [ethBalance, usdgBalance, ljbBalance] = await Promise.all([
        getBalance(walletAddress as `0x${string}`),
        getContractBalance({
          address: tokenConfig.USDG.address,
          abi: [{
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: 'balance', type: 'uint256' }],
          }],
          functionName: 'balanceOf',
          args: [walletAddress],
          chain: robinhood,
        }),
        getContractBalance({
          address: LJB_TOKEN,
          abi: [{
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: 'balance', type: 'uint256' }],
          }],
          functionName: 'balanceOf',
          args: [walletAddress],
          chain: robinhood,
        }),
      ])
      setBalances({
        ETH: { symbol: 'ETH', address: tokenConfig.ETH.address, balance: ethBalance, decimals: 18 },
        USDG: { symbol: 'USDG', address: tokenConfig.USDG.address, balance: BigInt((usdgBalance as bigint).toString() || '0'), decimals: 6 },
        LJB: { symbol: 'LJB', address: LJB_TOKEN, balance: BigInt((ljbBalance as bigint).toString() || '0'), decimals: LJB_DECIMALS },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch balances'
      setError(message)
      setBalances({
        ETH: { symbol: 'ETH', address: tokenConfig.ETH.address, balance: 0n, decimals: 18 },
        USDG: { symbol: 'USDG', address: tokenConfig.USDG.address, balance: 0n, decimals: 6 },
        LJB: { symbol: 'LJB', address: LJB_TOKEN, balance: 0n, decimals: LJB_DECIMALS },
      })
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchBalances()
    }
  }, [isOpen, fetchBalances])

  const fetchRoute = async (tokenKey: keyof typeof tokenConfig, amountHuman: string): Promise<RouteData> => {
    const tokenIn = tokenConfig[tokenKey]
    const amountWei = parseUnits(amountHuman, tokenIn.decimals).toString()
    const url = `${KYBERSWAP_API}/routes?tokenIn=${tokenIn.address}&tokenOut=${LJB_TOKEN}&amountIn=${amountWei}&source=ai-agent-skills`
    const resp = await fetch(url, { headers: { 'X-Client-Id': 'ai-agent-skills' } })
    const json = await resp.json()

    if (json.code !== 0) throw new Error(json.message || 'Quote failed')

    const routeData = json.data
    if (!routeData || !routeData.routeSummary) throw new Error('No route found')

    return {
      amountOut: routeData.routeSummary.amountOut,
      gasUsd: routeData.routeSummary.gasUsd ?? '0.00',
      route: routeData.route,
      routeSummary: routeData.routeSummary,
      routerAddress: routeData.routerAddress,
    }
  }

  const handleMax = () => {
    const bal = balances[selectedToken]
    if (!bal) return
    let spendable = bal.balance
    if (selectedToken === 'ETH') {
      spendable = bal.balance > ETH_GAS_BUFFER ? bal.balance - ETH_GAS_BUFFER : 0n
    }
    setAmount(selectedToken === 'ETH' ? formatEther(spendable) : formatUnits(spendable, bal.decimals))
  }

  const handleQuote = async () => {
    if (!amount || Number(amount) <= 0) return
    setError(null)
    setButtonText('Getting Quote...')
    try {
      const route = await fetchRoute(selectedToken, amount)
      setQuoteResult(route)
      setButtonText('Swap')
    } catch (err: any) {
      console.error(err)
      setError('Quote failed — no liquidity for this pair')
      setButtonText('Quote')
    }
  }

  const checkAllowance = async (owner: string, spender: string, token: string) => {
    try {
      const allowance = await getContractBalance({
        address: token,
        abi: [{
          name: 'allowance',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
          outputs: [{ name: 'value', type: 'uint256' }],
        }],
        functionName: 'allowance',
        args: [owner, spender],
        chain: robinhood,
      })
      return allowance as bigint
    } catch {
      return 0n
    }
  }

  const handleSwap = async () => {
    if (!quoteResult || !amount || !address) {
      setError('Connect wallet and get a quote first')
      return
    }
    setIsSwapping(true)
    setError(null)
    setButtonText('Swapping...')
    try {
      const tokenIn = tokenConfig[selectedToken]
      const amountWei = parseUnits(amount, tokenIn.decimals)

      // Re-fetch the route immediately before building — routes go stale fast (~30s)
      const freshRoute = await fetchRoute(selectedToken, amount)
      setQuoteResult(freshRoute)

      // ERC-20 input only: approve the router to pull tokenIn.
      // Native ETH has no approval — it travels as transactionValue (msg.value).
      if (!tokenIn.isNative) {
        const allowance = await checkAllowance(address, freshRoute.routerAddress, tokenIn.address)
        if (allowance < amountWei) {
          const approveData = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [freshRoute.routerAddress as `0x${string}`, amountWei],
          })
          const approveTx = await sendRawTransaction({
            account: address as `0x${string}`,
            to: tokenIn.address as `0x${string}`,
            data: approveData as `0x${string}`,
            value: 0n,
          })
          await PUBLIC_CLIENT.waitForTransactionReceipt({ hash: approveTx as `0x${string}` })
        }
      }

      const deadline = Math.floor(Date.now() / 1000) + 600
      const buildResp = await fetch(`${KYBERSWAP_API}/route/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': 'ai-agent-skills',
        },
        body: JSON.stringify({
          routeSummary: freshRoute.routeSummary,
          sender: address,
          recipient: address,
          slippageTolerance: 50,
          deadline,
          source: 'ai-agent-skills',
          skipSimulateTx: false,
          enableGasEstimation: true,
        }),
      })
      if (!buildResp.ok) {
        const body = await buildResp.text()
        throw new Error(`Build failed: ${buildResp.status} ${body.slice(0, 200)}`)
      }
      const buildJson = await buildResp.json()
      if (buildJson.code !== 0) throw new Error(buildJson.message || 'Build failed')

      const tx = buildJson.data
      await sendRawTransaction({
        account: address as `0x${string}`,
        to: tx.routerAddress as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: tx.transactionValue ? BigInt(tx.transactionValue) : 0n,
        gas: tx.gas ? BigInt(tx.gas) : undefined,
      })

      setButtonText('Quote')
      setQuoteResult(null)
      setAmount('')
      fetchBalances()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Swap failed')
      setButtonText('Swap')
    } finally {
      setIsSwapping(false)
    }
  }

  const toggleAccordion = () => {
    setIsOpen(prev => !prev)
    setError(null)
    setQuoteResult(null)
    setButtonText('Quote')
    setAmount('')
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <div
        onClick={toggleAccordion}
        style={{
          padding: '10px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#C6FE00', fontWeight: 900, fontFamily: 'Rubik', fontSize: '14px' }}>
          {isOpen ? '▼' : '▶'} Get LJB Tokens
        </span>
        <span style={{ color: '#fff', fontFamily: 'Rubik', fontSize: '12px' }}>
          Swap to LJB on Robinhood
        </span>
      </div>

      {isOpen && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading && <span style={{ color: '#fff', fontSize: '12px' }}>Loading balances...</span>}

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['ETH', 'USDG'] as const).map(token => (
              <button
                key={token}
                className={`btn ${selectedToken === token ? 'btn-primary' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedToken(token)
                  setQuoteResult(null)
                  setButtonText('Quote')
                }}
                style={{ flex: 1 }}
              >
                {token}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              className="input"
              placeholder="Amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setQuoteResult(null)
                setButtonText('Quote')
              }}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={(e) => { e.stopPropagation(); handleMax() }}
              style={{ width: '130px', flexShrink: 0 }}
            >
              Max
            </button>
          </div>

          <div style={{ fontSize: '11px', color: '#fff', opacity: 0.6 }}>
            Balance:{' '}
            {balances.LJB
              ? Number(formatUnits(balances.LJB.balance, LJB_DECIMALS)).toFixed(6)
              : '0'}{' '}
            LJB
          </div>

          {quoteResult && (
            <div className="panel" style={{ padding: '8px 12px' }}>
              <strong>Quote:</strong> {formatUnits(BigInt(quoteResult.amountOut), LJB_DECIMALS)} LJB
              <br />
              <span style={{ fontSize: '11px', opacity: 0.7 }}>Gas: ~{quoteResult.gasUsd} USD</span>
            </div>
          )}

          {error && (
            <div style={{ color: '#ff537b', fontSize: '12px' }}>{error}</div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={quoteResult ? handleSwap : handleQuote}
            disabled={isSwapping}
          >
            {buttonText}
          </button>
        </div>
      )}
    </div>
  )
}