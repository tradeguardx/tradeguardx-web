/** Page h1 + one-line sub, per the type scale. Right slot for actions. */
export default function PageHead({ eyebrow, title, sub, right, children }) {
  return (
    <div className="dph">
      <div className="dph-text">
        {eyebrow && <div className="dsh-mono" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h1 className="dsh-h1">{title}</h1>
        {sub && <p className="dsh-body dph-sub">{sub}</p>}
        {children}
      </div>
      {right && <div className="dph-right">{right}</div>}
    </div>
  );
}
