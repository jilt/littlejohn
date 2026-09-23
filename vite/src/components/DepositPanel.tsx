import { useState, useContext, useRef, useEffect } from 'react'
import { parseUnits, formatUnits } from 'viem'
import GetLjbTokens from './GetLjbTokens'
import { sendContractTransaction, vaultDeposit, getTokenBalance, getAllowance, simulateContract } from '../connector.tsx'
import { WalletContext } from '../connector.tsx'
import { CONTRACTS } from '../config/contracts'

const LJB_DECIMALS = 18
const USDC_DECIMALS = 6

// NEAR Intents config
const USDG_ROBINHOOD = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168'
const USDC_ETHEREUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const ONECLICK_API = 'https://1click.chaindefuser.com'
const ONECLICK_JWT = (import.meta as any).env?.VITE_ONECLICK_JWT as string | undefined
const QUOTE_TTL_MS = 10 * 60 * 1000
const STATUS_POLL_MS = 10_000

const LJB_TOKEN = CONTRACTS.robinhood.ljbToken
const ADAPTER_ADDRESS = CONTRACTS.robinhood.adapter

const ERC20_APPROVE_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

const ERC20_TRANSFER_ABI = [
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'transfer',
    outputs: [{ name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

interface IntentToken {
  assetId: string
  blockchain: string
  contractAddress: string | null
  decimals: number
}

type BridgePath = 'checking' | 'intentLjb' | 'fallbackUsdg' | 'unsupported'

type BridgeStep =
  | 'idle'
  | 'quoting'
  | 'approving'
  | 'depositing'
  | 'withdrawing'
  | 'intent_deposit'
  | 'intent_pending'
  | 'vault'
  | 'done'
  | 'error'

const authHeaders = (): Record<string, string> =>
  ONECLICK_JWT ? { Authorization: `Bearer ${ONECLICK_JWT}` } : {}

export default function DepositPanel() {
  const [amount, setAmount] = useState('')
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const { address, switchChain } = useContext(WalletContext)
  const [depositing, setDepositing] = useState(false)
  const [bridgeStep, setBridgeStep] = useState<BridgeStep>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [ljbBalance, setLjbBalance] = useState<bigint>(0n)
  const [insufficientBalance, setInsufficientBalance] = useState(false)

  const [path, setPath] = useState<BridgePath>('checking')
  const [intentAssets, setIntentAssets] = useState<{ origin: IntentToken; dest: IntentToken } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- Route capability detection (runs once) -----------------------------

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const resp = await fetch(`${ONECLICK_API}/v0/tokens`)
        const tokens = (await resp.json()) as IntentToken[]
        const byContract = (chain: string, addr: string) =>
          tokens.find(
            t => t.blockchain === chain &&
              t.contractAddress?.toLowerCase() === addr.toLowerCase()
          ) ?? null

        const ljb = byContract('robinhood', LJB_TOKEN)
        const usdg = byContract('robinhood', USDG_ROBINHOOD)
        const usdc = byContract('eth', USDC_ETHEREUM)
        if (cancelled) return

        if (ljb && usdc) {
          setIntentAssets({ origin: ljb, dest: usdc })
          setPath('intentLjb')
        } else if (usdg && usdc) {
          setIntentAssets({ origin: usdg, dest: usdc })
          setPath('fallbackUsdg')
        } else {
          setPath('unsupported')
        }
      } catch {
        if (!cancelled) setPath('unsupported')
      }
    })()
    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // --- 1Click helpers ------------------------------------------------------

  const requestQuote = async (dry: boolean, amountIn: bigint, userAddress: string) => {
    if (!intentAssets) throw new Error('Intent assets not resolved')
    const resp = await fetch(`${ONECLICK_API}/v0/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        dry,
        swapType: 'EXACT_INPUT',
        slippageTolerance: 100,
        originAsset: intentAssets.origin.assetId,
        depositType: 'ORIGIN_CHAIN',
        destinationAsset: intentAssets.dest.assetId,
        amount: amountIn.toString(),
        recipient: userAddress,       // EOA — same address on Ethereum
        recipientType: 'DESTINATION_CHAIN',
        refundTo: userAddress,        // refund lands back on Robinhood
        refundType: 'ORIGIN_CHAIN',
        deadline: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
        referral: 'ai-agent-skills',
      }),
    })
    const json = await resp.json()
    if (!resp.ok || json.message) throw new Error(json.message || 'Intent quote failed')
    const quote = json.quote ?? json
    if (!dry && !quote.depositAddress) throw new Error('No deposit address in quote')
    return quote
  }

  const waitForIntent = (depositAddress: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const resp = await fetch(
            `${ONECLICK_API}/v0/status?depositAddress=${depositAddress}`,
            { headers: authHeaders() }
          )
          const json = await resp.json()
          const s = json.status as string
          if (s === 'SUCCESS') {
            clearInterval(pollRef.current!)
            resolve()
          } else if (s === 'REFUNDED' || s === 'FAILED') {
            clearInterval(pollRef.current!)
            reject(new Error(`Intent ${s.toLowerCase()} — funds refunded to your wallet on Robinhood`))
          }
        } catch { /* tolerate transient polling errors */ }
      }, STATUS_POLL_MS)
    })

  const submitDepositTx = async (depositAddress: string, txHash: string) => {
    try {
      await fetch(`${ONECLICK_API}/v0/deposit/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ depositAddress, txHash }),
      })
    } catch { /* optional: speeds up detection only */ }
  }

  const executeIntent = async (
    token: string,
    amountIn: bigint,
    userAddress: `0x${string}`
  ): Promise<bigint> => {
    setBridgeStep('quoting')
    const quote = await requestQuote(false, amountIn, userAddress)

    setBridgeStep('intent_deposit')
    const txHash = await sendContractTransaction({
      account: userAddress,
      address: token,
      abi: ERC20_TRANSFER_ABI,
      functionName: 'transfer',
      args: [quote.depositAddress, amountIn],
    })
    await submitDepositTx(quote.depositAddress, txHash)

    setBridgeStep('intent_pending')
    await waitForIntent(quote.depositAddress)

    return BigInt(quote.amountOut ?? quote.minAmountOut ?? '0')
  }

  // --- Legs -----------------------------------------------------------------

  // Direct: LJB -> (intent: solver swaps + bridges) -> USDC on Ethereum
  const runIntentLjbLeg = (assets: bigint, userAddress: `0x${string}`) =>
    executeIntent(LJB_TOKEN, assets, userAddress)

  // Fallback: LJB -> adapter swap to USDG (Robinhood) -> intent USDG -> USDC (Ethereum)
  const runFallbackLeg = async (assets: bigint, userAddress: `0x${string}`): Promise<bigint> => {
    const currentAllowance = await getAllowance({
      tokenAddress: LJB_TOKEN,
      owner: userAddress,
      spender: ADAPTER_ADDRESS,
    })
    if (currentAllowance < assets) {
      setBridgeStep('approving')
      await sendContractTransaction({
        account: userAddress,
        address: LJB_TOKEN,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [ADAPTER_ADDRESS, assets],
      })
    }

    setBridgeStep('depositing')
    const simulated = await simulateContract({
      account: userAddress,
      address: ADAPTER_ADDRESS,
      abi: [
        {
          inputs: [{ name: 'amount', type: 'uint256' }, { name: 'recipient', type: 'address' }],
          name: 'depositAndBridge',
          outputs: [{ name: 'requestId', type: 'uint256' }, { name: 'amountOut', type: 'uint256' }],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'depositAndBridge',
      args: [assets, userAddress],
    })
    const amountOut = (simulated as any).amountOut ?? (simulated as any).result?.[1] ?? BigInt(0)

    setBridgeStep('withdrawing')
    await sendContractTransaction({
      account: userAddress,
      address: ADAPTER_ADDRESS,
      abi: [
        {
          inputs: [{ name: 'amount', type: 'uint256' }],
          name: 'withdrawUSDG',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'withdrawUSDG',
      args: [amountOut],
    })

    return executeIntent(USDG_ROBINHOOD, amountOut, userAddress)
  }

  // --- Dry-quote preview (direct path only) ---------------------------------

  useEffect(() => {
    if (path !== 'intentLjb' || !intentAssets || !address || !amount || Number(amount) <= 0) {
      setPreview(null)
      return
    }
    const t = setTimeout(async () => {
      try {
        const q = await requestQuote(true, parseUnits(amount, LJB_DECIMALS), address)
        setPreview(formatUnits(BigInt(q.amountOut ?? q.minAmountOut ?? '0'), USDC_DECIMALS))
      } catch {
        setPreview(null)
      }
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, path, address, intentAssets])

  // --- Deposit flow -----------------------------------------------------------

  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0 || !address || !intentAssets) return
    setBridgeStep('idle')
    setErrorMsg('')
    setInsufficientBalance(false)
    try {
      await switchChain(4663)
      const assets = parseUnits(amount, LJB_DECIMALS)

      const balance = await getTokenBalance({ tokenAddress: LJB_TOKEN, account: address })
      setLjbBalance(balance)
      if (balance < assets) {
        setInsufficientBalance(true)
        setErrorMsg('Insufficient LJB balance')
        setBridgeStep('error')
        return
      }

      setDepositing(true)

      const usdcAmount =
        path === 'intentLjb'
          ? await runIntentLjbLeg(assets, address as `0x${string}`)
          : await runFallbackLeg(assets, address as `0x${string}`)

      await switchChain(1)
      setBridgeStep('vault')
      await vaultDeposit({
        account: address,
        assets: usdcAmount,
        receiver: address,
      })

      setBridgeStep('done')
      setAmount('')
      setPreview(null)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Deposit failed')
      setBridgeStep('error')
    } finally {
      setDepositing(false)
    }
  }

  const stepLabel = (step: string) => {
    const labels: Record<string, string> = {
      quoting: 'Quoting NEAR Intent...',
      approving: 'Approving LJB spend...',
      depositing: 'Depositing LJB into adapter...',
      withdrawing: 'Withdrawing USDG from adapter...',
      intent_deposit: 'Sending deposit to intent address...',
      intent_pending: 'Solver executing cross-chain swap (can take a minute)...',
      vault: 'Depositing USDC into Ethereum vault...',
      done: '✓ Deposit complete!',
      error: '✗ Deposit failed',
    }
    return labels[step] || ''
  }

  const pathNote = () => {
    if (path === 'checking') return 'Checking intent route support...'
    if (path === 'intentLjb') return '⚡ Direct: LJB → USDC via NEAR Intents (no approvals)'
    if (path === 'fallbackUsdg') return 'Via adapter swap + NEAR Intents (LJB not solver-listed yet)'
    return 'Cross-chain deposits unavailable: no solver route from Robinhood Chain'
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        <button
          className={`btn ${tab === 'deposit' ? 'btn-primary' : ''}`}
          onClick={() => setTab('deposit')}
        >
          Deposit
        </button>
        <button
          className={`btn ${tab === 'withdraw' ? 'btn-primary' : ''}`}
          onClick={() => setTab('withdraw')}
        >
          Withdraw
        </button>
      </div>

      {tab === 'deposit' ? (
        <div>
          <p>Deposit LJB tokens (Robinhood Chain)</p>
          <p style={{ fontSize: '12px', color: '#FFFFFF', opacity: 0.7 }}>
            LJB → NEAR Intents → USDC → Ethereum vault
          </p>
          <p
            style={{
              fontSize: '11px',
              marginTop: '4px',
              color: path === 'intentLjb' ? '#C6FE00' : '#fff',
              opacity: 0.8,
            }}
          >
            {pathNote()}
          </p>

          <GetLjbTokens />

          {ljbBalance > 0n && (
            <p style={{ fontSize: '12px', color: '#fff', marginTop: '4px' }}>
              Your LJB balance: {formatUnits(ljbBalance, LJB_DECIMALS)}
            </p>
          )}

          <input
            type="text"
            className="input"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ marginTop: '12px', marginBottom: '12px' }}
          />

          {preview && path === 'intentLjb' && (
            <p style={{ fontSize: '11px', color: '#fff', opacity: 0.7, marginBottom: '12px' }}>
              Est. receive: {preview} USDC on Ethereum
            </p>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleDeposit}
            disabled={depositing || path === 'checking' || path === 'unsupported'}
          >
            {bridgeStep === 'done' ? 'Deposited!' : bridgeStep === 'error' ? 'Retry' : 'Deposit'}
          </button>

          {insufficientBalance && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#ff4444' }}>
              Insufficient LJB balance
            </p>
          )}

          {bridgeStep !== 'idle' && bridgeStep !== 'done' && !insufficientBalance && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#fff' }}>
              {stepLabel(bridgeStep)}
            </p>
          )}

          {bridgeStep === 'intent_pending' && (
            <a
              href="https://explorer.near-intents.org"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '11px', color: '#C6FE00', textDecoration: 'underline' }}
            >
              Track on Intents Explorer (search your deposit address)
            </a>
          )}

          {errorMsg && !insufficientBalance && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#ff4444' }}>
              {errorMsg}
            </p>
          )}
        </div>
      ) : (
        <div>
          <p>Withdraw your share of the vault</p>
          <div className="panel">
            <strong>Your Shares:</strong><br />
            0.00 LJB
          </div>

          <input
            type="text"
            className="input"
            placeholder="Shares to withdraw"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ marginBottom: '12px' }}
          />

          <button className="btn btn-primary" style={{ width: '100%' }}>
            Withdraw
          </button>
        </div>
      )}

      <div className="status-bar">
        0% token fees • Fee only on reward claims
      </div>
    </div>
  )
}