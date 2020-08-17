const {
    Client,
    MirrorClient,
    MirrorConsensusTopicQuery,
    ConsensusTopicCreateTransaction,
    ConsensusMessageSubmitTransaction,
    Ed25519PrivateKey
} = require("@hashgraph/sdk");

async function main() {
    const operatorPrivateKey = Ed25519PrivateKey.fromString(process.env.OPERATOR_KEY);
    const operatorAccount = process.env.OPERATOR_ID;
    const mirrorNodeAddress = process.env.MIRROR_NODE_ADDRESS;

    // generate a new key to use for signing messages
    const topicSigner = await Ed25519PrivateKey.generate();

    if (operatorPrivateKey == null ||
      operatorAccount == null ||
      mirrorNodeAddress == null) {
        throw new Error("environment variables OPERATOR_KEY, OPERATOR_ID, MIRROR_NODE_ADDRESS must be present");
    }

    const consensusClient = new MirrorClient(mirrorNodeAddress);

    const client = Client.forTestnet();
    client.setOperator(operatorAccount, operatorPrivateKey);

    const transactionId = await new ConsensusTopicCreateTransaction()
        .setTopicMemo("sdk example create_pub_sub.js")
        .setMaxTransactionFee(100000000000)
    // .setAdminKey(operatorPrivateKey.publicKey) // allows updateTopic
        .setSubmitKey(topicSigner.publicKey) // allows control access to submit messages
        .execute(client);

    const transactionReceipt = await transactionId.getReceipt(client);
    const topicId = transactionReceipt.getConsensusTopicId();

    console.log(`topicId = ${topicId}`);

    // wait 10s to ensure new topic id propagates to mirror nodes
    console.log("waiting 10s for topic Id propagation to mirror node");
    await sleep(10000);

    new MirrorConsensusTopicQuery()
        .setTopicId(topicId)
        .subscribe(
            consensusClient,
            (message) => console.log(message.toString()),
            (error) => console.log(`Error: ${error}`)
        );

    for (let i = 0; ; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await (await new ConsensusMessageSubmitTransaction()
            .setTopicId(topicId)
            .setMessage(`Hello, HCS! Message ${i}`)
            .sign(topicSigner) // Must sign by the topic's submitKey
            .execute(client))
            .getReceipt(client);

        console.log(`Sent message ${i}`);

        // eslint-disable-next-line no-await-in-loop
        await sleep(2500);
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

main();

