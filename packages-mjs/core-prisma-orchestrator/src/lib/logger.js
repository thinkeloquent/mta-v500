import chalk from 'chalk';
export const logger = {
    info: (message) => {
        console.log(chalk.cyan(message));
    },
    success: (message) => {
        console.log(chalk.green(`✓ ${message}`));
    },
    error: (message) => {
        console.error(chalk.red(`✗ ${message}`));
    },
    warn: (message) => {
        console.warn(chalk.yellow(`⚠ ${message}`));
    },
    step: (step, total, message) => {
        console.log(chalk.magenta(`[${step}/${total}] ${message}`));
    },
    header: (message) => {
        console.log();
        console.log(chalk.bold.cyan(message));
        console.log(chalk.cyan('='.repeat(message.length)));
    },
    section: (message) => {
        console.log();
        console.log(chalk.blue(`▶ ${message}`));
    },
    dim: (message) => {
        console.log(chalk.gray(message));
    },
};
//# sourceMappingURL=logger.js.map