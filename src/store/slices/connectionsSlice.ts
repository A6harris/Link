import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ConnectionsState {
  dismissedIds: string[];
}

const initialState: ConnectionsState = {
  dismissedIds: [],
};

const connectionsSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    dismissSuggestion(state, action: PayloadAction<string>) {
      if (!state.dismissedIds.includes(action.payload)) {
        state.dismissedIds.push(action.payload);
      }
    },
    clearDismissed(state) {
      state.dismissedIds = [];
    },
  },
});

export const { dismissSuggestion, clearDismissed } = connectionsSlice.actions;
export default connectionsSlice.reducer;
