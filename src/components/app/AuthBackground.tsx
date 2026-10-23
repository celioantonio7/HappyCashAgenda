import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
const Mesh = lazy(() => import('@paper-design/shaders-react').then(module => ({ default: module.MeshGradient })));
class ShaderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
export function AuthBackground() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(!document.hidden);
  const [supported] = useState(() => {
    try { const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true; } catch { return false; }
  });
  useEffect(() => { const update = () => setVisible(!document.hidden); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  return <div className="auth-backdrop" aria-hidden="true">{supported && <ShaderBoundary><Suspense fallback={null}><Mesh width="100%" height="100%" colors={['#090B0A', '#121614', '#1B211D', '#8FD927', '#B9FF39']} distortion={0.7} swirl={0.15} grainMixer={0} grainOverlay={0.025} speed={reduced || !visible ? 0 : 0.12} frame={42000} minPixelRatio={1} maxPixelCount={800000} /></Suspense></ShaderBoundary>}</div>;
}
