import { configureStore, Reducer, ReducersMapObject, Action } from '@reduxjs/toolkit';
import { rtkApi } from '@/shared/api/rtkApi';
import { StateSchema } from './StateSchema';
import { createReducerManager } from './reducerManager';
import { authReducer } from '@/features/Auth/model/slice/authSlice';

type AsyncReducers = Omit<ReducersMapObject<StateSchema>, 'auth'>;

export function createReduxStore(
  initialState?: StateSchema,
  asyncReducers?: AsyncReducers,
) {
  // Статические редьюсеры
  const staticReducers: ReducersMapObject<StateSchema> = {
    auth: authReducer,
    [rtkApi.reducerPath]: rtkApi.reducer,
  };

  // Комбинируем статические редьюсеры с асинхронными
  const rootReducers: ReducersMapObject<StateSchema> = {
    ...staticReducers,
    ...(asyncReducers || {}),
  };

  const reducerManager = createReducerManager(rootReducers);

  const middleware = (getDefaultMiddleware: any) =>
    getDefaultMiddleware().concat(
      rtkApi.middleware,
    );

  const store = configureStore({
    reducer: reducerManager.reduce as Reducer<StateSchema, Action>,
    devTools: __IS_DEV__,
    preloadedState: initialState,
    middleware,
  });

  // @ts-ignore
  store.reducerManager = reducerManager;

  return store;
}

export type AppDispatch = ReturnType<typeof createReduxStore>['dispatch'];
