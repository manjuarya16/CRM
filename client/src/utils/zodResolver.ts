import { FieldValues, Resolver } from "react-hook-form";
import { ZodSchema } from "zod";

function setIn(obj: Record<string, any>, pathArray: (string | number)[], value: any) {
  let current = obj;
  for (let i = 0; i < pathArray.length; i++) {
    const rawKey = pathArray[i];
    const key = typeof rawKey === "number" ? rawKey : String(rawKey);
    const isNextNumber = i + 1 < pathArray.length && typeof pathArray[i + 1] === "number";

    if (i === pathArray.length - 1) {
      if (!current[key]) {
        current[key] = value;
      }
    } else {
      if (!current[key] || typeof current[key] !== "object") {
        current[key] = isNextNumber ? [] : {};
      }
      current = current[key];
    }
  }
}

export const customZodResolver = <TFieldValues extends FieldValues = any>(
  schema: ZodSchema<any, any, any>
): Resolver<TFieldValues> => {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return {
        values: result.data as TFieldValues,
        errors: {},
      };
    }

    const errors: Record<string, any> = {};
    const issues = (result.error as any)?.issues || (result.error as any)?.errors || [];

    issues.forEach((issue: any) => {
      if (issue.path && issue.path.length > 0) {
        setIn(errors, issue.path, {
          type: issue.code || "validation",
          message: issue.message,
        });
      } else {
        if (!errors.root) {
          errors.root = {
            type: issue.code || "validation",
            message: issue.message,
          };
        }
      }
    });

    return {
      values: {} as TFieldValues,
      errors: errors as any,
    };
  };
};

export const zodResolver = customZodResolver;
export default customZodResolver;
