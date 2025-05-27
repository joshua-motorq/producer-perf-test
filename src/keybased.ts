import { runProducer } from "./producer";


async function main() {
    console.log('Running with key based batching');
    await runProducer(true);
}

main().catch(e => {
    console.log('Error: ', e);
    throw e;
});
