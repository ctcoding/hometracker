import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
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

function App() {
  return (
    <BrowserRouter>
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
          <Route path="/tariffs" element={<Tariffs />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/edit-reading/:id" element={<EditReading />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
