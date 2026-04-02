export type ActionFailure = {
  success: false;
  error: string;
};

export type ActionSuccess<T> = {
  success: true;
  data: T;
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function ok<T>(data: T): ActionSuccess<T> {
  return { success: true, data };
}

export function fail(error: string): ActionFailure {
  return { success: false, error };
}
