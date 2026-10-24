import { useEffect, useState } from 'react';
import NumberFlow, { usePrefersReducedMotion, type Format } from '@number-flow/react';

type Props = {
  value: number;
  currency?: boolean;
  decimals?: number;
  suffix?: string;
};

/** Uses the same number animation engine as Bklit's chart centers. */
export function AnimatedNumber({ value, currency=false, decimals=0, suffix }: Props) {
  const reduced = usePrefersReducedMotion();
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntered(true));
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, []);
  const format: Format = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    ...(currency ? { style: 'currency', currency: 'BRL' } : {}),
  };
  return <span className="animated-number"><span className="sr-only">{new Intl.NumberFormat('pt-BR',format).format(value)}{suffix}</span><NumberFlow aria-hidden="true" value={entered||reduced?value:0} locales="pt-BR" format={format} suffix={suffix} animated={!reduced} respectMotionPreference transformTiming={{duration:650,easing:'ease-out'}} spinTiming={{duration:650,easing:'ease-out'}} opacityTiming={{duration:180,easing:'ease-out'}} isolate/></span>;
}
