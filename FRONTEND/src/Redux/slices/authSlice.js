import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';


export const registerUser = createAsyncThunk(
    'auth/register',
    async (userFData, { rejectWithValue }) => {
        try {
            const response = await api.post('/auth/register', userData, {
                headers: { 'Content-Type': 'multipart/form-data'}
            });
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Registration failed');
        }
    }
);

export const loginUser = createAsyncThunk(
    'auth/login',
    async (Credentials, { rejectWithValue }) => {
        try {
            const response = await api.post('/auth/login', Credentials);
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Login failed');
        }
    }
);

const initialState = {
    user: null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            localStorage.removeItem('token');
            toast.info('Logged out successfully');
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(registerUser.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(registerUser.fulfilled, (state) => {
            state.loading = false;
            toast.success('Registration successful! Please login.');
        })
        .addCase(registerUser.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload;
            toast.error(action.payload);
        })
        .addCase(loginUser.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        // Adjust these paths based on your actual backend response structure
        // Example: backend returns { data: { accessToken: "...", user: {...} } }
        const { accessToken, user } = action.payload.data; 
        
        state.token = accessToken;
        state.user = user;
        localStorage.setItem('token', accessToken);
        toast.success('Login successful!');
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload);
      });
    }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;