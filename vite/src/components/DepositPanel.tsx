import { useState, useContext } from 'react'
import { parseUnits } from 'viem'
import GetLjbTokens from './GetLjbTokens'
import { sendContractTransaction, bridgeUSDGToUSDC, vaultDeposit, getTokenBalance, getAllowance } from '../connector.tsx'
import { WalletContext } from '../connector.tsx'
import { CONTRACTS } from '../config/contracts'

const LJB_DECIMALS = 18
const ERC20_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const
const { ljbToken: LJB_TOKEN, adapter: ADAPTER_ADDRESS } = CONTRACTS.robinhood

export default function DepositPanel() {
  const [amount, setAmount] = useState('')
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const { address, switchChain } = useContext(WalletContext)
  const [depositing, setDepositing] = useState(false)
  const [bridgeStep, setBridgeStep] = useState<'idle' | 'approving' | 'depositing' | 'bridging' | 'vault' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [ljbBalance, setLjbBalance] = useState<bigint>(0n)
  const [insufficientBalance, setInsufficientBalance] = useState(false)

  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0 || !address) return
    setBridgeStep('approving')
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
      const currentAllowance = await getAllowance({
        tokenAddress: LJB_TOKEN,
        owner: address,
        spender: ADAPTER_ADDRESS,
      })
      if (currentAllowance < assets) {
        setBridgeStep('approving')
        await sendContractTransaction({
          account: address,
          address: LJB_TOKEN,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [ADAPTER_ADDRESS, assets],
        })
      }

      const newAllowance = await getAllowance({
        tokenAddress: LJB_TOKEN,
        owner: address,
        spender: ADAPTER_ADDRESS,
      })
      if (newAllowance < assets) {
        setInsufficientBalance(true)
        setErrorMsg('Allowance not set correctly')
        setBridgeStep('error')
        return
      }

      setBridgeStep('depositing')
      const depositResult = await sendContractTransaction({
        account: address,
        address: ADAPTER_ADDRESS,
        abi: [
          {
            inputs: [{ name: 'amount', type: 'uint256' }, { name: 'recipient', type: 'address' }],
            name: 'depositAndBridge',
            outputs: [{ name: 'requestId', type: 'uint256' }],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ],
        functionName: 'depositAndBridge',
        args: [assets, address],
      })

      setBridgeStep('bridging')
      const { amountOut } = await bridgeUSDGToUSDC(
        assets,
        address,
        address
      )

      setBridgeStep('vault')
      await vaultDeposit({
        account: address,
        assets: amountOut,
        receiver: address,
      })

      setBridgeStep('done')
      setAmount('')
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
      approving: 'Approving LJB spend...',
      depositing: 'Depositing LJB into adapter...',
      bridging: 'Bridging USDG to Ethereum...',
      vault: 'Depositing USDC into vault...',
      done: '✓ Deposit complete!',
      error: '✗ Deposit failed',
    }
    return labels[step] || ''
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
            LJB → USDG → bridge → USDC → Ethereum vault
          </p>

          <GetLjbTokens />

          {ljbBalance > 0n && (
            <p style={{ fontSize: '12px', color: '#fff', marginTop: '4px' }}>
              Your LJB balance: {ljbBalance.toString()}
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

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleDeposit} disabled={depositing}>
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
