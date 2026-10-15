import { ImageResponse } from 'next/og';
export const alt = 'Bible Diaries — Every walk has a story. Make room for yours.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',padding:'80px',background:'#f0f9ff',color:'#0f172a',fontFamily:'sans-serif',borderBottom:'12px solid #0284c7'}}><div style={{fontSize:28,color:'#0369a1',marginBottom:44}}>BIBLE DIARIES · COMING SOON</div><div style={{fontSize:72,fontWeight:700,letterSpacing:-3}}>Every walk has a story.</div><div style={{fontSize:72,color:'#0284c7',letterSpacing:-3}}>Make room for yours.</div><div style={{fontSize:25,marginTop:42,color:'#475569'}}>Google Play & Huawei AppGallery first. Apple App Store later.</div></div>, size);
}
