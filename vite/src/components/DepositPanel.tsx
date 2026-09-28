import { useContext, useState } from 'react'
import { formatUnits, getAddress, parseUnits } from 'viem'
import GetLjbTokens from './GetLjbTokens'
import {
  getAllowance,
  getNativeBalance,
  getTokenBalance,
  sendContractTransaction,
  sendRawTransaction,
  waitForEthereumTransactionReceipt,
  waitForTransactionReceipt,
  vaultDeposit,
  quoteUniswapBridge,
  createUniswapBridgeTransaction,
  quoteKyberSwap,
  buildKyberSwapTransaction,
} from '../connector.tsx'
import { WalletContext } from '../connector.tsx'
import { ETH_YIELD_VAULT_ADDRESS } from '../config/ethYieldVaultABI'
import { CONTRACTS } from '../config/contracts'
import { ethereum, robinhood } from '../chains'

const ROBINHOOD_CHAIN_ID = 4663
const ETHEREUM_CHAIN_ID = 1
const LJB_DECIMALS = 18
const LJB_TOKEN = getAddress(CONTRACTS.robinhood.ljbToken)
const ETH_YIELD_VAULT = getAddress(ETH_YIELD_VAULT_ADDRESS)
const USDC_ETHEREUM = getAddress('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')
const PERMIT2_ADDRESS = getAddress('0x000000000022D473030F116dDEE9F6B43aC78BA3')
const NATIVE_ETH = '0x0000000000000000000000000000000000000000'
const KYBER_NATIVE_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const GAS_RESERVE_BPS = 1500n
const BPS = 10_000n

const ERC20_APPROVE_ABI = [{
  inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
  name: 'approve',
  outputs: [{ name: '', type: 'bool' }],
  stateMutability: 'nonpayable',
  type: 'function',
}] as const

type Step = 'idle' | 'quoting' | 'approving' | 'swapping' | 'bridge_quoting' | 'bridge_pending' | 'ethereum_swap' | 'vault_approving' | 'vault' | 'done' | 'error'
interface SwapTransaction { to: `0x${string}`; data: `0x${string}`; value?: string; chainId: number; gas?: string; gasLimit?: string }
interface UniswapQuote { requestId: string; routing: string; isTokenApprovalApplicable?: boolean; permitData?: unknown; quote: any; swapTransaction?: SwapTransaction | null }
interface KyberQuote { routeSummary: unknown; amountOut?: string }

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
const errorText = (error: unknown) => error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)

export default function DepositPanel() {
  const [amount, setAmount] = useState('')
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const { address, chainId, switchChain } = useContext(WalletContext)
  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [ljbBalance, setLjbBalance] = useState<bigint>(0n)
  const [bridgeResponse, setBridgeResponse] = useState<UniswapQuote | null>(null)
  const [depositing, setDepositing] = useState(false)

  const ensureLjbApproval = async (user: `0x${string}`, required: bigint) => {
    const allowance = await getAllowance({ tokenAddress: LJB_TOKEN, owner: user, spender: PERMIT2_ADDRESS, chain: robinhood })
    if (allowance >= required) return
    setStep('approving')
    const hash = await sendContractTransaction({ account: user, address: LJB_TOKEN, abi: ERC20_APPROVE_ABI, functionName: 'approve', args: [PERMIT2_ADDRESS, required], chain: robinhood }) as `0x${string}`
    const receipt = await waitForTransactionReceipt(hash)
    if (receipt.status !== 'success') throw new Error('LJB Permit2 approval reverted')
  }

  const waitForUsdcIncrease = async (user: string, starting: bigint) => {
    const deadline = Date.now() + 30 * 60 * 1000
    while (Date.now() < deadline) {
      const current = await getTokenBalance({ tokenAddress: USDC_ETHEREUM, account: user, chain: ethereum })
      if (current > starting) return current
      await sleep(10_000)
    }
    throw new Error('Timed out waiting for Ethereum USDC settlement')
  }

  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0) { setErrorMsg('Enter an amount first'); return }
    if (!address) { setErrorMsg('Connect your wallet first'); return }
    setDepositing(true)
    setErrorMsg('')
    setBridgeResponse(null)
    try {
      const user = getAddress(address)
      if (chainId !== ROBINHOOD_CHAIN_ID) await switchChain(ROBINHOOD_CHAIN_ID)
      const amountIn = parseUnits(amount, LJB_DECIMALS)
      const balance = await getTokenBalance({ tokenAddress: LJB_TOKEN, account: user, chain: robinhood })
      setLjbBalance(balance)
      if (balance < amountIn) throw new Error('Insufficient LJB balance')

      // The existing first leg is intentionally unchanged: LJB -> native ETH on Robinhood.
      setStep('quoting')
      const firstLeg = await quoteUniswapBridge({ tokenIn: LJB_TOKEN, tokenOut: NATIVE_ETH, tokenInChainId: ROBINHOOD_CHAIN_ID, tokenOutChainId: ROBINHOOD_CHAIN_ID, amount: amountIn, swapper: user }) as UniswapQuote
      if (!firstLeg.swapTransaction) throw new Error('First-leg Uniswap quote did not return a transaction')
      await ensureLjbApproval(user, amountIn)
      setStep('swapping')
      const firstPayload = firstLeg.swapTransaction
      const firstHash = await sendRawTransaction({ account: user, to: firstPayload.to, data: firstPayload.data, value: BigInt(firstPayload.value ?? '0'), gas: firstPayload.gas || firstPayload.gasLimit ? BigInt(firstPayload.gas || firstPayload.gasLimit || '0') : undefined, chain: robinhood })
      const firstReceipt = await waitForTransactionReceipt(firstHash)
      if (firstReceipt.status !== 'success') throw new Error('LJB → native ETH swap reverted')

      const nativeBalance = await getNativeBalance(user, robinhood)
      const gasReserve = (nativeBalance * GAS_RESERVE_BPS) / BPS
      const bridgeAmount = nativeBalance - gasReserve
      if (bridgeAmount <= 0n) throw new Error('Insufficient native ETH after reserving Robinhood gas')

      const startingUsdc = await getTokenBalance({ tokenAddress: USDC_ETHEREUM, account: user, chain: ethereum })
      setStep('bridge_quoting')
      const bridge = await quoteUniswapBridge({ tokenIn: NATIVE_ETH, tokenOut: NATIVE_ETH, tokenInChainId: ROBINHOOD_CHAIN_ID, tokenOutChainId: ETHEREUM_CHAIN_ID, amount: bridgeAmount, swapper: user, recipient: user }) as UniswapQuote
      setBridgeResponse(bridge)
      console.log('[Uniswap] bridge response', bridge)
      if (bridge.routing !== 'BRIDGE') throw new Error(`Expected direct BRIDGE route, received ${bridge.routing}`)
      if (bridge.quote?.output?.token?.toLowerCase() !== NATIVE_ETH.toLowerCase()) throw new Error('Bridge output is not native Ethereum ETH')

      setStep('bridge_pending')
      const bridgePayload = await createUniswapBridgeTransaction(bridge)
      const bridgeHash = await sendRawTransaction({ account: user, to: bridgePayload.to, data: bridgePayload.data, value: BigInt(bridgePayload.value ?? '0'), gas: bridgePayload.gasLimit ? BigInt(bridgePayload.gasLimit) : undefined, chain: robinhood })
      const bridgeReceipt = await waitForTransactionReceipt(bridgeHash)
      if (bridgeReceipt.status !== 'success') throw new Error('Uniswap ETH bridge transaction reverted')

      await switchChain(ETHEREUM_CHAIN_ID)
      const ethBeforeKyber = await getNativeBalance(user, ethereum)
      if (ethBeforeKyber <= 0n) throw new Error('No Ethereum ETH received for the KyberSwap leg')
      setStep('ethereum_swap')
      const kyberQuote = await quoteKyberSwap({ chainId: ETHEREUM_CHAIN_ID, tokenIn: KYBER_NATIVE_ETH, tokenOut: USDC_ETHEREUM, amountIn: ethBeforeKyber.toString(), sender: user }) as KyberQuote
      const kyberTx = await buildKyberSwapTransaction({ chainId: ETHEREUM_CHAIN_ID, routeSummary: kyberQuote.routeSummary, sender: user, recipient: user })
      const kyberHash = await sendRawTransaction({ account: user, to: getAddress(kyberTx.to), data: kyberTx.data, value: BigInt(kyberTx.value ?? '0'), gas: kyberTx.gas ? BigInt(kyberTx.gas) : undefined, chain: ethereum })
      const kyberReceipt = await waitForEthereumTransactionReceipt(kyberHash)
      if (kyberReceipt.status !== 'success') throw new Error('KyberSwap Ethereum ETH → USDC swap reverted')

      const endingUsdc = await getTokenBalance({ tokenAddress: USDC_ETHEREUM, account: user, chain: ethereum })
      const received = endingUsdc - startingUsdc
      if (received <= 0n) throw new Error('KyberSwap completed but produced no measurable USDC increase')
      setStep('vault_approving')
      const approvalHash = await sendContractTransaction({ account: user, address: USDC_ETHEREUM, abi: ERC20_APPROVE_ABI, functionName: 'approve', args: [ETH_YIELD_VAULT, received], chain: ethereum }) as `0x${string}`
      const approvalReceipt = await waitForEthereumTransactionReceipt(approvalHash)
      if (approvalReceipt.status !== 'success') throw new Error('USDC approval reverted')
      setStep('vault')
      const vaultReceipt = await vaultDeposit({ account: user, assets: received, receiver: user })
      if (vaultReceipt.status !== 'success') throw new Error('Vault deposit reverted')
      setStep('done')
      setAmount('')
    } catch (error) {
      console.error('[DepositPanel] deposit failed', error)
      setErrorMsg(errorText(error))
      setStep('error')
    } finally { setDepositing(false) }
  }

  const labels: Record<string, string> = { quoting: 'Getting LJB → native ETH quote...', approving: 'Approving LJB for Uniswap...', swapping: 'Executing existing LJB → native ETH swap...', bridge_quoting: 'Getting Uniswap native ETH → Ethereum native ETH bridge quote...', bridge_pending: 'Building and sending the Uniswap bridge transaction...', ethereum_swap: 'Swapping Ethereum ETH → USDC with KyberSwap...', vault_approving: 'Approving USDC for the Ethereum vault...', vault: 'Depositing USDC into the Ethereum vault...', done: '✓ Deposit complete!', error: '✗ Deposit failed' }

  return <div>
    <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}><button className={`btn ${tab === 'deposit' ? 'btn-primary' : ''}`} onClick={() => setTab('deposit')}>Deposit</button><button className={`btn ${tab === 'withdraw' ? 'btn-primary' : ''}`} onClick={() => setTab('withdraw')}>Withdraw</button></div>
    {tab === 'deposit' ? <div><p>Deposit LJB tokens (Robinhood Chain)</p><p style={{ fontSize: '12px', color: '#FFFFFF', opacity: 0.7 }}>LJB → native ETH → Uniswap bridge → Ethereum ETH → KyberSwap USDC vault</p><GetLjbTokens />{ljbBalance > 0n && <p style={{ fontSize: '12px', color: '#fff' }}>Your LJB balance: {formatUnits(ljbBalance, LJB_DECIMALS)}</p>}<input className="input" placeholder="Amount" value={amount} onChange={event => setAmount(event.target.value)} style={{ marginTop: '12px', marginBottom: '12px' }} /><button className="btn btn-primary" style={{ width: '100%' }} onClick={handleDeposit} disabled={depositing}>{step === 'done' ? 'Deposited!' : step === 'error' ? 'Retry' : 'Deposit'}</button>{step !== 'idle' && step !== 'done' && <p style={{ marginTop: '8px', fontSize: '12px', color: '#fff' }}>{labels[step]}</p>}{errorMsg && <p style={{ marginTop: '8px', fontSize: '12px', color: '#ff4444' }}>{errorMsg}</p>}{bridgeResponse && <pre style={{ marginTop: '12px', maxHeight: '320px', overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '10px', color: '#fff', background: '#111', padding: '8px' }}>{JSON.stringify(bridgeResponse, null, 2)}</pre>}</div> : <div><p>Withdraw your share of the vault</p><div className="panel"><strong>Your Shares:</strong><br />0.00 LJB</div><input className="input" placeholder="Shares to withdraw" value={amount} onChange={event => setAmount(event.target.value)} /><button className="btn btn-primary" style={{ width: '100%' }}>Withdraw</button></div>}
    <div className="status-bar">0% token fees • Fee only on reward claims</div>
  </div>
}