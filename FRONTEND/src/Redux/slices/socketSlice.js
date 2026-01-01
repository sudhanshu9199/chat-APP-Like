import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    onlineUsers: [],
};

const socketSlice = createSlice({
    name: 'socket',
    initialState,
    reducers: {
        setonlineUsers: (state, action) => {
            state.onlineUsers = action.payload;
        },
    },
});

export const { setonlineUsers } = socketSlice.actions;
export default socketSlice.reducer;