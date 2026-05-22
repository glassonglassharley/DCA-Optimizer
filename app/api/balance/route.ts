import { NextResponse } from 'next/server';

// Wallet addresses
const EVM_ADDRESS = '0x02254227C888EB6793bdbe931a2Db12759F81585';
const SOLANA_ADDRESS = '5EEYG3GtkA33EkBGakj83YnUEeyxmrnupEztqK3g2ETJ';

// Contract addresses on Base
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH_BASE = '0x4200000000000000000000000000000000000006';
const AAVE_POOL = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';
const AERODROME_LP = '0xcDAC0d6c6C59727a65F871236188350531885C43'; // ETH/USDC pool

// ERC20 ABI (minimal)
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// Aave Pool ABI (minimal)
const AAVE_POOL_ABI = [
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
];

export async function GET() {
  try {
    // Return live portfolio data
    // In production, this would query on-chain data
    // For now, return the current known balances
    
    const portfolio = {
      wallet: EVM_ADDRESS,
      solanaWallet: SOLANA_ADDRESS,
      lastUpdated: new Date().toISOString(),
      balances: {
        eth: {
          balance: '0.00016',
          value: 0.38
        },
        usdc: {
          balance: '0.12',
          value: 0.12
        },
        aave: {
          balance: '2.42',
          value: 2.42,
          asset: 'USDC',
          apy: '~3.5%'
        },
        aerodromeLP: {
          balance: '0.00146 WETH + 3.38 USDC',
          value: 6.80,
          pool: 'ETH/USDC Volatile',
          apy: '~15-25%'
        }
      },
      totalValue: 9.22,
      totalDeployed: 9.22,
      strategies: {
        mondayDeployment: {
          schedule: 'Every Monday 9 AM PT',
          nextRun: '2026-03-23T16:00:00.000Z',
          allocations: ['10% Aave', '10% Beefy', '10% Aerodrome']
        },
        baseYieldAgent: {
          schedule: 'Every 7 days',
          status: 'Active',
          harvests: ['AERO rewards', 'LP fees']
        }
      },
      reviewDate: '2026-06-15'
    };

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}
