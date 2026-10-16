import unittest
from spectrum import ChainSnapshot,combine
class Tests(unittest.TestCase):
 def test_all_chains(self):
  t=1700000000000;meta=lambda usd:{'pairs':[{'from':'BTC','to':'USD'}],'collaterals':[{'collateralIndex':1,'collateralConfig':{'precision':'1000000000000000000'},'prices':{'collateralPriceUsd':usd}}]}
  rows=lambda amount:[{'trade':{'user':'0xuser','index':0,'pairIndex':0,'collateralIndex':1,'collateralAmount':str(amount),'leverage':2000,'long':True,'isOpen':True,'tradeType':0}}]
  old={n:ChainSnapshot(n,t,t,meta(2000),rows(1e18)) for n in ['ARBITRUM','POLYGON','BASE']}
  current=[ChainSnapshot(n,t+60000,t+60000,meta(3000),rows(1e18)) for n in old]
  rates={(n,1,0):(.00001,t+60000) for n in old};a=combine(current,old,rates,'BTC/USD',t+60000)
  self.assertEqual(a['oi_long'],18000);self.assertEqual(a['long_growth'],0);self.assertEqual(len(a['coverage']),3);self.assertAlmostEqual(a['funding'],.00001)
  current[0].rows=rows(2e18);a=combine(current,old,rates,'BTC/USD',t+60000);self.assertAlmostEqual(a['long_growth'],1/3)
if __name__=='__main__':unittest.main()
