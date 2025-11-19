import chalk from 'chalk';

export const logger = {
  info: (message: string) => {
    console.log(chalk.cyan(message));
  },

  success: (message: string) => {
    console.log(chalk.green(`✓ ${message}`));
  },

  error: (message: string) => {
    console.error(chalk.red(`✗ ${message}`));
  },

  warn: (message: string) => {
    console.warn(chalk.yellow(`⚠ ${message}`));
  },

  step: (step: number, total: number, message: string) => {
    console.log(chalk.magenta(`[${step}/${total}] ${message}`));
  },

  header: (message: string) => {
    console.log();
    console.log(chalk.bold.cyan(message));
    console.log(chalk.cyan('='.repeat(message.length)));
  },

  section: (message: string) => {
    console.log();
    console.log(chalk.blue(`▶ ${message}`));
  },

  dim: (message: string) => {
    console.log(chalk.gray(message));
  },
};
