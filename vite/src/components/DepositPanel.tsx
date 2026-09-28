import { useContext, useEffect, useRef, useState } from 'react'
import { formatUnits, parseUnits } from 'viem'
import GetLjbTokens from './GetLjbTokens'
import {
  getAllowance,
  getTokenBalance,
  sendContractTransaction,
  sendRawTransaction,
  waitForTransactionReceipt,
  vaultDeposit,
} from '../connector.tsx'
import { WalletContext } from '../connector.tsx'
import { ETH_YIELD_VAULT_ADDRESS } from '../config/ethYieldVaultABI'
import { CONTRACTS } from '../config/contracts'
import { ethereum, robinhood } from '../chains'


const ROBINHOOD_CHAIN_ID = 4663
const ETHEREUM_CHAIN_ID = 1
const LJB_DECIMALS = 18


const LJB_TOKEN = CONTRACTS.robinhood.ljbToken as `0x${string}`
const ETH_YIELD_VAULT = ETH_YIELD_VAULT_ADDRESS as `0x${string}`
const USDC_ETHEREUM =
  '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as `0x${string}`
const PERMIT2_ADDRESS =
  '0x000000000022D473030F116dDEE9F6B43aC78BA3' as `0x${string}`
const NATIVE_ETH = '0x0000000000000000000000000000000000000000'
const UNISWAP_API_URL = 'https://trade-api.gateway.uniswap.org/v1'
const UNISWAP_API_KEY = (import.meta as any).env?.VITE_UNISWAP_API_KEY as
  | string
  | undefined
const ONECLICK_API = 'https://1click.chaindefuser.com'
const ONECLICK_JWT = (import.meta as any).env?.VITE_ONECLICK_JWT as
  | string
  | undefined
const QUOTE_TTL_MS = 10 * 60 * 1000
const STATUS_POLL_MS = 10_000
const INTENT_STATUS_TIMEOUT_MS = 20 * 60 * 1000
const UNISWAP_QUOTE_RETRY_DELAY_MS = 2_000
const UNISWAP_QUOTE_TIMEOUT_MS = 20_000
const GAS_RESERVE_BPS = 1500n
const BPS = 10_000n
const HOOD_ETH_ASSET_ID = 'nep141:hood.omft.near'
const ETH_USDC_ASSET_ID =
  'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near'


const ERC20_APPROVE_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const


type Step =
  | 'idle'
  | 'quoting'
  | 'approving'
  | 'swapping'
  | 'intent_quoting'
  | 'intent_deposit'
  | 'intent_pending'
  | 'vault_approving'
  | 'vault'
  | 'done'
  | 'error'


interface IntentToken {
  assetId: string
  blockchain: string
  contractAddress?: string | null
  decimals: number
  symbol?: string
  price?: number
  priceUpdatedAt?: string
  coingeckoId?: string
}


interface PermitData {
  domain: Record<string, unknown>
  types: Record<string, unknown>
  values: Record<string, unknown>
}


interface SwapTransaction {
  to: `0x${string}`
  from?: `0x${string}`
  data: `0x${string}`
  value?: string
  chainId: number
  gasLimit?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
}


interface UniswapQuote {
  requestId: string
  routing: string
  isTokenApprovalApplicable?: boolean
  permitData?: PermitData | null
  permitTransaction?: unknown | null
  swapTransaction?: SwapTransaction | null
  quote: {
    quoteId: string
    chainId: number
    swapper: `0x${string}`
    input: { amount: string; token: string }
    output: {
      amount: string
      minimumAmount: string
      token: string
      recipient: `0x${string}`
    }
    route: unknown[]
  }
}


interface IntentQuote {
  depositAddress: string
  depositMemo?: string
  depositType?: string
  amountIn?: string
  amountOut?: string
  amountInFormatted?: string
  amountOutFormatted?: string
}


const headers = (apiKey?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  ...(apiKey ? { 'x-api-key': apiKey } : {}),
})


const intentHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(!ONECLICK_JWT ? {} : { Authorization: `Bearer ${ONECLICK_JWT}` }),
})


const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const value = error as any
    return (
      value.shortMessage ||
      value.reason ||
      value.details ||
      value.message ||
      JSON.stringify(value)
    )
  }
  return 'Unknown error'
}


const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms))


const isRetryableUniswapError = (error: unknown): boolean => {
  const details = (error as any)?.uniswap
  const status = details?.status
  const errorCode = String(details?.errorCode ?? '').toLowerCase()


  return (
    status === 404 ||
    status === 408 ||
    status === 429 ||
    status >= 500 ||
    errorCode.includes('timeout') ||
    errorCode.includes('routing') ||
    errorCode.includes('tempor')
  )
}


const isPermitData = (value: unknown): value is PermitData => {
  if (!value || typeof value !== 'object') return false
  const permit = value as Record<string, unknown>
  return (
    typeof permit.domain === 'object' &&
    permit.domain !== null &&
    typeof permit.types === 'object' &&
    permit.types !== null &&
    typeof permit.values === 'object' &&
    permit.values !== null
  )
}


export default function DepositPanel() {
  const [amount, setAmount] = useState('')
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const { address, chainId, switchChain } = useContext(WalletContext)
  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [ljbBalance, setLjbBalance] = useState<bigint>(0n)
  const [preview, setPreview] = useState<string | null>(null)
  const [depositing, setDepositing] = useState(false)
  const [intentAssets, setIntentAssets] = useState<{
    origin: IntentToken
    destination: IntentToken
  } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)


  useEffect(() => {
    let cancelled = false


    ;(async () => {
      try {
        const response = await fetch(`${ONECLICK_API}/v0/tokens`, {
          headers: intentHeaders(),
        })
        const raw = await response.text()


        if (!response.ok) {
          throw new Error(
            `Intent token query failed: HTTP ${response.status}: ${raw.slice(0, 300)}`,
          )
        }


        const tokens = JSON.parse(raw) as IntentToken[]
        if (!Array.isArray(tokens)) {
          throw new Error('Intent token query did not return an array')
        }


        const nativeRobinhoodEth =
          tokens.find(
            token =>
              token.assetId.toLowerCase() === HOOD_ETH_ASSET_ID &&
              token.blockchain.toLowerCase() === 'hood' &&
              token.symbol?.toUpperCase() === 'ETH' &&
              Number(token.decimals) === 18,
          ) ?? null


        const usdc =
          tokens.find(
            token =>
              token.assetId.toLowerCase() === ETH_USDC_ASSET_ID &&
              token.blockchain.toLowerCase() === 'eth' &&
              token.symbol?.toUpperCase() === 'USDC' &&
              Number(token.decimals) === 6,
          ) ?? null


        if (cancelled) return


        if (!nativeRobinhoodEth || !usdc) {
          setIntentAssets(null)
          console.error('[DepositPanel] intent route unavailable', {
            nativeRobinhoodEth,
            usdc,
          })
          return
        }


        setIntentAssets({ origin: nativeRobinhoodEth, destination: usdc })
        console.log('[DepositPanel] intent route available', {
          origin: nativeRobinhoodEth,
          destination: usdc,
        })
      } catch (error) {
        console.error(
          '[DepositPanel] intent token discovery failed',
          getErrorMessage(error),
        )
        if (!cancelled) setIntentAssets(null)
      }
    })()


    return () => {
      cancelled = true
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [])


  const requestIntentQuote = async (
    amountIn: bigint,
    userAddress: `0x${string}`,
  ): Promise<IntentQuote> => {
    if (!intentAssets) {
      throw new Error('Native ETH → Ethereum USDC route unavailable')
    }


    const response = await fetch(`${ONECLICK_API}/v0/quote`, {
      method: 'POST',
      headers: intentHeaders(),
      body: JSON.stringify({
        dry: false,
        swapType: 'EXACT_INPUT',
        slippageTolerance: 100,
        originAsset: intentAssets.origin.assetId,
        depositType: 'ORIGIN_CHAIN',
        destinationAsset: intentAssets.destination.assetId,
        amount: amountIn.toString(),
        recipient: userAddress,
        recipientType: 'DESTINATION_CHAIN',
        refundTo: userAddress,
        refundType: 'ORIGIN_CHAIN',
        deadline: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
      }),
    })


    const raw = await response.text()
    let json: any
    try {
      json = JSON.parse(raw)
    } catch {
      throw new Error(`Intent quote returned invalid JSON: ${raw.slice(0, 300)}`)
    }


    if (!response.ok || json.message) {
      throw new Error(json.message || `Intent quote HTTP ${response.status}`)
    }


    const quote = json.quote ?? json
    if (!quote.depositAddress) {
      throw new Error('Intent quote did not return a deposit address')
    }
    if (
      quote.depositType &&
      quote.depositType.toUpperCase() !== 'ORIGIN_CHAIN'
    ) {
      throw new Error(`Unexpected intent deposit type: ${quote.depositType}`)
    }


    console.log('[Intent] quote ready', {
      depositAddress: quote.depositAddress,
      depositMemo: quote.depositMemo,
      amountIn: quote.amountIn,
      amountOut: quote.amountOut,
    })


    return quote as IntentQuote
  }


  const waitForIntent = (
    depositAddress: string,
    depositMemo?: string,
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }


      const startedAt = Date.now()
      let polling = false
      let lastStatus = ''


      const stop = () => {
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      }


      const poll = async () => {
        if (polling) return
        polling = true


        try {
          if (Date.now() - startedAt >= INTENT_STATUS_TIMEOUT_MS) {
            stop()
            reject(new Error('NEAR Intents status polling timed out'))
            return
          }


          const query = new URLSearchParams({
            depositAddress,
            ...(depositMemo ? { depositMemo } : {}),
          })


          const response = await fetch(
            `${ONECLICK_API}/v0/status?${query.toString()}`,
            { headers: intentHeaders() },
          )
          const raw = await response.text()


          if (!response.ok) {
            throw new Error(
              `Intent status HTTP ${response.status}: ${raw.slice(0, 300)}`,
            )
          }


          const json = JSON.parse(raw)
          const status = String(json.status ?? '').toUpperCase()


          if (status !== lastStatus) {
            lastStatus = status
            console.log('[Intent] status', {
              status,
              depositAddress,
              originTxHash:
                json.originChainTxHash ??
                json.originTxHash ??
                json.depositTxHash,
              destinationTxHash:
                json.destinationChainTxHash ?? json.destinationTxHash,
              amountOut:
                json.amountOut ??
                json.destinationAmount ??
                json.outputAmount,
            })
          }


          if (status === 'SUCCESS') {
            stop()
            resolve()
            return
          }


          if (
            status === 'FAILED' ||
            status === 'REFUNDED' ||
            status === 'INCOMPLETE_DEPOSIT'
          ) {
            stop()
            reject(
              new Error(
                `Intent ${status.toLowerCase()}: ${
                  json.reason || json.message || 'no additional details'
                }`,
              ),
            )
          }
        } catch (error) {
          console.error('[Intent] status poll failed', getErrorMessage(error))
        } finally {
          polling = false
        }
      }


      void poll()
      pollRef.current = setInterval(() => {
        void poll()
      }, STATUS_POLL_MS)
    })


  const requestUniswapQuoteOnce = async (
    amountIn: bigint,
    userAddress: `0x${string}`,
  ): Promise<UniswapQuote> => {
    if (!UNISWAP_API_KEY) {
      throw new Error('VITE_UNISWAP_API_KEY is not configured')
    }


    const requestBody = {
      tokenIn: LJB_TOKEN,
      tokenOut: NATIVE_ETH,
      tokenInChainId: ROBINHOOD_CHAIN_ID,
      tokenOutChainId: ROBINHOOD_CHAIN_ID,
      amount: amountIn.toString(),
      type: 'EXACT_INPUT',
      swapper: userAddress,
      protocols: ['V2', 'V3', 'V4'],
      routingPreference: 'BEST_PRICE',
      slippageTolerance: 1,
    }


    const response = await fetch(`${UNISWAP_API_URL}/quote`, {
      method: 'POST',
      headers: headers(UNISWAP_API_KEY),
      body: JSON.stringify(requestBody),
    })


    const raw = await response.text()
    let json: any
    try {
      json = JSON.parse(raw)
    } catch {
      throw new Error(
        `Uniswap quote returned invalid JSON: ${raw.slice(0, 500)}`,
      )
    }


    if (!response.ok || json.errorCode) {
      const error = new Error(
        `Uniswap quote failed: ${json.errorCode ?? `HTTP_${response.status}`} — ${
          json.detail || json.message || raw.slice(0, 500)
        }`,
      )
      ;(error as any).uniswap = {
        status: response.status,
        errorCode: json.errorCode,
        detail: json.detail,
        message: json.message,
        requestId: json.requestId,
        response: json,
      }
      throw error
    }


    return json as UniswapQuote
  }


  const requestUniswapQuote = async (
    amountIn: bigint,
    userAddress: `0x${string}`,
  ): Promise<UniswapQuote> => {
    const startedAt = Date.now()
    let lastError: unknown


    while (Date.now() - startedAt < UNISWAP_QUOTE_TIMEOUT_MS) {
      try {
        return await requestUniswapQuoteOnce(amountIn, userAddress)
      } catch (error) {
        lastError = error
        const elapsedMs = Date.now() - startedAt


        if (
          !isRetryableUniswapError(error) ||
          elapsedMs >= UNISWAP_QUOTE_TIMEOUT_MS
        ) {
          throw error
        }


        await sleep(
          Math.min(
            UNISWAP_QUOTE_RETRY_DELAY_MS,
            UNISWAP_QUOTE_TIMEOUT_MS - elapsedMs,
          ),
        )
      }
    }


    throw new Error(
      `Uniswap quote unavailable after ${UNISWAP_QUOTE_TIMEOUT_MS / 1000}s: ${getErrorMessage(lastError)}`,
    )
  }


  const signPermit2 = async (
    permitData: PermitData,
    userAddress: `0x${string}`,
  ) => {
    const wallet = (window as any).ethereum
    if (!wallet?.request) {
      throw new Error('Wallet provider unavailable for Permit2 signature')
    }


    return (await wallet.request({
      method: 'eth_signTypedData_v4',
      params: [
        userAddress,
        JSON.stringify({
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            ...permitData.types,
          },
          primaryType: 'PermitSingle',
          domain: permitData.domain,
          message: permitData.values,
        }),
      ],
    })) as `0x${string}`
  }


  const ensurePermit2Approval = async (
    amount: bigint,
    userAddress: `0x${string}`,
  ): Promise<void> => {
    const allowance = await getAllowance({
      tokenAddress: LJB_TOKEN,
      owner: userAddress,
      spender: PERMIT2_ADDRESS,
      chain: robinhood,
    })


    if (allowance >= amount) return


    const approvalHash = (await sendContractTransaction({
      account: userAddress,
      address: LJB_TOKEN,
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [PERMIT2_ADDRESS, amount],
      chain: robinhood,
    })) as `0x${string}`


    const approvalReceipt = await waitForTransactionReceipt(approvalHash)
    if (approvalReceipt.status !== 'success') {
      throw new Error('LJB Permit2 approval reverted')
    }
  }


  const executeSwapTransaction = async (
    transaction: SwapTransaction,
    userAddress: `0x${string}`,
  ): Promise<`0x${string}`> => {
    if (transaction.chainId !== ROBINHOOD_CHAIN_ID) {
      throw new Error(
        `Uniswap transaction targets chain ${transaction.chainId}, expected ${ROBINHOOD_CHAIN_ID}`,
      )
    }


    return await sendRawTransaction({
      account: userAddress,
      to: transaction.to,
      data: transaction.data,
      value: BigInt(transaction.value ?? '0'),
      gas: transaction.gasLimit ? BigInt(transaction.gasLimit) : undefined,
      chain: robinhood,
    })
  }


  const submitDeposit = async (
    depositAddress: string,
    txHash: `0x${string}`,
    depositMemo?: string,
  ) => {
    const response = await fetch(`${ONECLICK_API}/v0/deposit/submit`, {
      method: 'POST',
      headers: intentHeaders(),
      body: JSON.stringify({
        depositAddress,
        txHash,
        ...(depositMemo ? { depositMemo } : {}),
      }),
    })


    const raw = await response.text()
    let json: any
    try {
      json = JSON.parse(raw)
    } catch {
      throw new Error(
        `Deposit submission returned invalid JSON: ${raw.slice(0, 300)}`,
      )
    }


    if (!response.ok) {
      throw new Error(
        json.message ||
          json.error ||
          json.detail ||
          `Deposit submission HTTP ${response.status}`,
      )
    }


    return json
  }


  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Enter an amount first')
      return
    }
    if (!address) {
      setErrorMsg('Connect your wallet first')
      return
    }
    if (!intentAssets) {
      setErrorMsg('Native Robinhood ETH → Ethereum USDC route unavailable')
      return
    }


    setDepositing(true)
    setErrorMsg('')


    try {
      if (chainId !== ROBINHOOD_CHAIN_ID) await switchChain(ROBINHOOD_CHAIN_ID)


      const amountIn = parseUnits(amount, LJB_DECIMALS)
      const balance = (await getTokenBalance({
        tokenAddress: LJB_TOKEN,
        account: address,
      })) as bigint
      setLjbBalance(balance)
      if (balance < amountIn) throw new Error('Insufficient LJB balance')


      setStep('quoting')
      const quoteResponse = await requestUniswapQuote(
        amountIn,
        address as `0x${string}`,
      )
      const output = quoteResponse.quote?.output


      if (!output?.amount || !output?.token) {
        throw new Error('Uniswap quote has no valid output')
      }
      if (output.token.toLowerCase() !== NATIVE_ETH.toLowerCase()) {
        throw new Error(`Uniswap quote output is not native ETH: ${output.token}`)
      }


      const quotedEth = BigInt(output.amount)
      if (quotedEth <= 0n) {
        throw new Error('Uniswap quote returned zero native ETH')
      }


      const permitData = isPermitData(quoteResponse.permitData)
        ? quoteResponse.permitData
        : undefined


      if (
        quoteResponse.permitData !== null &&
        quoteResponse.permitData !== undefined &&
        !permitData
      ) {
        throw new Error('Uniswap quote returned malformed permitData')
      }


      const transaction = quoteResponse.swapTransaction


      if (!transaction) {
        throw new Error('Uniswap quote did not return swapTransaction')
      }


      await ensurePermit2Approval(
        amountIn,
        address as `0x${string}`,
      )


      setStep('swapping')


      const swapHash = await executeSwapTransaction(
        transaction,
        address as `0x${string}`,
      )
      const receipt = await waitForTransactionReceipt(swapHash)
      if (receipt.status !== 'success') {
        throw new Error('Uniswap swap reverted')
      }


      const gasReserve = (quotedEth * GAS_RESERVE_BPS) / BPS
      const intentAmount = quotedEth - gasReserve
      if (intentAmount <= 0n) {
        throw new Error('Swap output is insufficient after reserving Robinhood gas')
      }


      setStep('intent_quoting')
      const intentQuote = await requestIntentQuote(
        intentAmount,
        address as `0x${string}`,
      )


      console.log('[Intent] quote ready', {
        depositAddress: intentQuote.depositAddress,
        depositMemo: intentQuote.depositMemo,
        amountIn: intentQuote.amountIn,
        amountOut: intentQuote.amountOut,
      })


      const startingUsdcBalance = (await getTokenBalance({
        tokenAddress: USDC_ETHEREUM,
        account: address,
        chain: ethereum,
      })) as bigint


      setStep('intent_deposit')
      const intentHash = await sendRawTransaction({
        account: address as `0x${string}`,
        to: intentQuote.depositAddress as `0x${string}`,
        data: '0x',
        value: intentAmount,
        chain: robinhood,
      })


      console.log('[Intent] deposit sent', {
        txHash: intentHash,
        depositAddress: intentQuote.depositAddress,
        amount: intentAmount.toString(),
      })


      const intentReceipt = await waitForTransactionReceipt(intentHash)
      if (intentReceipt.status !== 'success') {
        throw new Error('Intent ETH deposit transaction reverted')
      }


      console.log('[Intent] deposit confirmed', {
        txHash: intentHash,
        status: intentReceipt.status,
      })


      const submitResult = await submitDeposit(
        intentQuote.depositAddress,
        intentHash,
        intentQuote.depositMemo,
      )


      console.log('[Intent] deposit submitted', {
        txHash: intentHash,
        depositAddress: intentQuote.depositAddress,
        accepted: submitResult,
      })


      setStep('intent_pending')
      await waitForIntent(
        intentQuote.depositAddress,
        intentQuote.depositMemo,
      )


      await switchChain(ETHEREUM_CHAIN_ID)


      const endingUsdcBalance = (await getTokenBalance({
        tokenAddress: USDC_ETHEREUM,
        account: address,
        chain: ethereum,
      })) as bigint


      if (endingUsdcBalance < startingUsdcBalance) {
        throw new Error(
          'Ethereum USDC balance decreased during the intent; cannot determine received amount',
        )
      }


      const receivedUsdc = endingUsdcBalance - startingUsdcBalance
      if (receivedUsdc <= 0n) {
        throw new Error('No new USDC received on Ethereum')
      }


      setStep('vault_approving')
      const approveHash = (await sendContractTransaction({
        account: address,
        address: USDC_ETHEREUM,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [ETH_YIELD_VAULT, receivedUsdc],
        chain: ethereum,
      })) as `0x${string}`
      const approvalReceipt = await waitForTransactionReceipt(approveHash)
      if (approvalReceipt.status !== 'success') {
        throw new Error('USDC approval reverted')
      }


      setStep('vault')
      await vaultDeposit({
        account: address,
        assets: receivedUsdc,
        receiver: address,
      })


      setStep('done')
      setAmount('')
      setPreview(null)
    } catch (error) {
      console.error('[DepositPanel] deposit failed', getErrorMessage(error))
      setErrorMsg(getErrorMessage(error))
      setStep('error')
    } finally {
      setDepositing(false)
    }
  }


  const stepLabel: Record<string, string> = {
    quoting: 'Getting Uniswap LJB → native ETH quote...',
    approving: 'Approving LJB for Uniswap Permit2...',
    swapping: 'Swapping LJB → native ETH on Robinhood...',
    intent_quoting: 'Getting NEAR Intents ETH → USDC quote...',
    intent_deposit: 'Sending native ETH to the intent deposit address...',
    intent_pending: 'Waiting for USDC on Ethereum...',
    vault_approving: 'Approving USDC for the Ethereum vault...',
    vault: 'Depositing USDC into the Ethereum vault...',
    done: '✓ Deposit complete!',
    error: '✗ Deposit failed',
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
            LJB → native ETH → NEAR Intents → Ethereum USDC vault
          </p>
          <GetLjbTokens />


          {ljbBalance > 0n && (
            <p style={{ fontSize: '12px', color: '#fff', marginTop: '4px' }}>
              Your LJB balance: {formatUnits(ljbBalance, LJB_DECIMALS)}
            </p>
          )}


          {preview && (
            <p style={{ fontSize: '11px', color: '#fff', opacity: 0.7 }}>
              Estimated native ETH: {preview}
            </p>
          )}


          <input
            type="text"
            className="input"
            placeholder="Amount"
            value={amount}
            onChange={event => setAmount(event.target.value)}
            style={{ marginTop: '12px', marginBottom: '12px' }}
          />


          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleDeposit}
            disabled={depositing}
          >
            {step === 'done' ? 'Deposited!' : step === 'error' ? 'Retry' : 'Deposit'}
          </button>


          {step !== 'idle' && step !== 'done' && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#fff' }}>
              {stepLabel[step]}
            </p>
          )}
          {errorMsg && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#ff4444' }}>
              {errorMsg}
            </p>
          )}
        </div>
      ) : (
        <div>
          <p>Withdraw your share of the vault</p>
          <div className="panel">
            <strong>Your Shares:</strong>
            <br />0.00 LJB
          </div>
          <input
            type="text"
            className="input"
            placeholder="Shares to withdraw"
            value={amount}
            onChange={event => setAmount(event.target.value)}
            style={{ marginBottom: '12px' }}
          />
          <button className="btn btn-primary" style={{ width: '100%' }}>
            Withdraw
          </button>
        </div>
      )}


      <div className="status-bar">0% token fees • Fee only on reward claims</div>
    </div>
  )
}