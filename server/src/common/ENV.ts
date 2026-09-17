import { NodeEnvs } from './index.ts';

const ENV = {
  NodeEnv: (process.env.NODE_ENV as NodeEnvs) || NodeEnvs.Dev,
  Port: process.env.PORT ? Number(process.env.PORT) : undefined,
};

export default ENV;
