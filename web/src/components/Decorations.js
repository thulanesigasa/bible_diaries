import Logo from './Logo';
export default function Decorations({ variant = 'light' }) {
  return <div className={`decorations decorations-${variant}`} aria-hidden="true">
    <span className="deco-guide deco-guide-one"/><span className="deco-guide deco-guide-two"/>
    <span className="deco-ring deco-ring-one"/><span className="deco-ring deco-ring-two"/>
    <span className="deco-diamond deco-diamond-one"/><span className="deco-diamond deco-diamond-two"/>
    <svg className="deco-cross-mark" viewBox="0 0 32 44" fill="none"><path d="M16 2v40M3 15h26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    <span className="deco-dot-cluster">{Array.from({length:9}, (_, index) => <i key={index}/>)}</span>
    <span className="deco-brand-watermark"><Logo size={320}/></span>
  </div>;
}
