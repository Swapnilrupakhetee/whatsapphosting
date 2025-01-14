import "./App.css";
import Admin from "./Pages/Admin";
import {Routes,Route} from "react-router-dom";
import PaymentReminder from './Pages/PaymentReminder';
import NewProducts from './Pages/NewProducts';
import Member from "./Pages/Member";

function App() {
  return (
    <>
      <div className="main-container">
        <Admin />
        <Routes>
        <Route exact path="/" element={<PaymentReminder />} />
        <Route exact path="/payment-reminder" element={<PaymentReminder />} />
        <Route exact path="new-product" element={<NewProducts/>} />
        <Route exact path="/member" element={<Member/>} />

        </Routes>
      </div>
    </>
  );
}

export default App;
