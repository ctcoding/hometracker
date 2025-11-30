import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './lib/auth-store';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Settings from './pages/Settings';
import Tariffs from './pages/Tariffs';
import Payments from './pages/Payments';
import AddReading from './pages/AddReading';
import Fernwaerme from './pages/Fernwaerme';
import Elwa from './pages/Elwa';
import Finanzen from './pages/Finanzen';
import Umwelt from './pages/Umwelt';
import EditReading from './pages/EditReading';
import UserSettings from './pages/UserSettings';

function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/fernwaerme" element={<Fernwaerme />} />
                <Route path="/elwa" element={<Elwa />} />
                <Route path="/finanzen" element={<Finanzen />} />
                <Route path="/umwelt" element={<Umwelt />} />
                <Route path="/history" element={<History />} />
                <Route path="/add-reading" element={<AddReading />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/user-settings" element={<UserSettings />} />
                <Route path="/tariffs" element={<Tariffs />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/edit-reading/:id" element={<EditReading />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
