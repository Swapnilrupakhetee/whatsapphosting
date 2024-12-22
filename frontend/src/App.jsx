import "./App.css";
import Admin from "./Pages/Admin";
import {Routes,Route} from "react-router-dom";
import PaymentReminder from './Pages/PaymentReminder';
import NewProducts from './Pages/NewProducts';

function App() {
  return (
    <>
      <div className="main-container">
        <Admin />
        <Routes>
        <Route exact path="/" element={<Admin />} />
        <Route exact path="/payment-reminder" element={<PaymentReminder />} />
        <Route exact path="new-product" element={<NewProducts/>} />

        </Routes>
      </div>
    </>
  );
}

export default App;
