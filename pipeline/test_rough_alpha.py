import unittest
from rough_alpha import Signature2, RoughPathIndicator, Microstructure, deform, ReadRouter

class Tests(unittest.TestCase):
    def test_chen_inverse(self):
        s=Signature2();s.append((1,2));s.append((2,1));s.remove_prefix((1,2))
        self.assertEqual(s.first,[2,1]);self.assertEqual(s.second,[[2,1],[1,.5]])
    def test_rolling_signature(self):
        import math
        stream=RoughPathIndicator(window=8)
        prices=[100+math.sin(i/5) for i in range(1000)]
        for i,p in enumerate(prices):
            result=stream.update(1700000000000+i*60000,p)
            if i<8:continue
            direct=Signature2()
            for k in range(i-7,i+1):direct.append((60000,math.log(prices[k]/prices[k-1])))
            self.assertAlmostEqual(result['area'],direct.area/direct.first[0]/(math.sqrt(stream.qv)+1e-12),places=8)
        self.assertEqual(len(stream.increments),8)
        with self.assertRaises(ValueError):stream.update(1,100)
    def test_skew(self):
        t=1700000000000;s=Microstructure(t,900,100,.04,-100,100,.00002,t,t,t)
        up,low,risk,active=deform(100,10,s,t)
        self.assertAlmostEqual(up,103.6);self.assertEqual(low,86);self.assertEqual(risk,.8);self.assertTrue(active)
        self.assertFalse(deform(100,10,s,t+120001)[3])
    def test_routing(self):
        import io
        class Response(io.BytesIO):
            status=200
            def geturl(self):return self.url
        state={'up':False,'now':0};calls=[]
        def fetch(req,timeout):
            calls.append(req.full_url)
            if '.trade' in req.full_url and not state['up']:raise OSError('DNS')
            r=Response(b'{}');r.url=req.full_url;return r
        r=ReadRouter(fetch,lambda:state['now']);url='https://backend-polygon.gains.trade/open-trades'
        r.get(url);self.assertEqual(calls[-1],url.replace('.trade','.dev'))
        state.update(up=True,now=61);r.get(url);self.assertEqual(calls[-1],url)
        with self.assertRaises(ValueError):r.get('https://gains.trade.evil.com/')
if __name__=='__main__':unittest.main()
