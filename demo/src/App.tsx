import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Playground from './pages/Playground';
import Examples from './pages/Examples';

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        <nav className="top-nav">
          <span className="nav-brand">react-shahmat</span>
          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Examples
            </NavLink>
            <NavLink to="/playground" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Playground
            </NavLink>
          </div>
        </nav>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Routes>
            <Route path="/" element={<Examples />} />
            <Route path="/playground" element={<Playground />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
