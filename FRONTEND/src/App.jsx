import { ToastContainer, toast } from "react-toastify";
import MainRoute from "./router/MainRoute";

const App = () => {
  return (
    <>
      <MainRoute />
      <ToastContainer />
    </>
  );
};

export default App;
