import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./Redux/store.js";
import { SocketContextProvider } from "./context/SocketContext.jsx";
import api from './services/api.js'
import { logout } from './Redux/slices/authSlice.js';
import { toast } from "react-toastify";

api.interceptors.response.use(
    response => response,
    err => {
        if (err.response && err.response.status === 401 && !error.config.url.includes('/login')) {
            store.dispatch(logout());
            toast.info('Session expired. Please login again.');
        }
        return Promise.reject(err);
    }
);

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
    <SocketContextProvider>
      <App />
    </SocketContextProvider>
    </BrowserRouter>
  </Provider>
);
