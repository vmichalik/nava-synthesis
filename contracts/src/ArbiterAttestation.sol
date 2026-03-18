// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ArbiterAttestation
 * @notice Records Arbiter verification results as on-chain attestations.
 *         Each verified trade produces an immutable receipt: intent hash,
 *         result (PASS/FAIL), node counts, and execution tx hash.
 *
 *         Follows the ERC-8004 Validation Registry pattern — any agent or
 *         protocol can query an agent's verification history on-chain.
 */
contract ArbiterAttestation {

    struct Attestation {
        address agent;           // Agent wallet that requested verification
        bytes32 intentHash;      // keccak256 of the human intent string
        uint8 decision;          // 0 = REJECT, 1 = PASS
        uint16 passedNodes;      // Number of nodes that passed
        uint16 failedNodes;      // Number of nodes that failed
        uint16 skippedNodes;     // Number of nodes skipped
        bytes32 executionTxHash; // Swap tx hash (0x0 if not executed)
        string protocol;         // e.g. "uniswap"
        uint256 timestamp;       // Block timestamp
    }

    // All attestations ever recorded
    Attestation[] public attestations;

    // Agent address -> attestation indices
    mapping(address => uint256[]) public agentAttestations;

    // Intent hash -> attestation index (latest)
    mapping(bytes32 => uint256) public intentToAttestation;

    // Events
    event AttestationRecorded(
        uint256 indexed attestationId,
        address indexed agent,
        bytes32 indexed intentHash,
        uint8 decision,
        uint16 passedNodes,
        uint16 failedNodes,
        bytes32 executionTxHash
    );

    /**
     * @notice Record an Arbiter verification result on-chain.
     * @param intentHash keccak256 hash of the human intent string
     * @param decision 1 for PASS, 0 for REJECT
     * @param passedNodes Number of verification nodes that passed
     * @param failedNodes Number of verification nodes that failed
     * @param skippedNodes Number of verification nodes skipped
     * @param executionTxHash The swap transaction hash (bytes32(0) if not executed)
     * @param protocol The protocol name (e.g. "uniswap")
     * @return attestationId The index of the new attestation
     */
    function recordAttestation(
        bytes32 intentHash,
        uint8 decision,
        uint16 passedNodes,
        uint16 failedNodes,
        uint16 skippedNodes,
        bytes32 executionTxHash,
        string calldata protocol
    ) external returns (uint256 attestationId) {
        attestationId = attestations.length;

        attestations.push(Attestation({
            agent: msg.sender,
            intentHash: intentHash,
            decision: decision,
            passedNodes: passedNodes,
            failedNodes: failedNodes,
            skippedNodes: skippedNodes,
            executionTxHash: executionTxHash,
            protocol: protocol,
            timestamp: block.timestamp
        }));

        agentAttestations[msg.sender].push(attestationId);
        intentToAttestation[intentHash] = attestationId;

        emit AttestationRecorded(
            attestationId,
            msg.sender,
            intentHash,
            decision,
            passedNodes,
            failedNodes,
            executionTxHash
        );
    }

    /**
     * @notice Get the total number of attestations for an agent.
     */
    function getAgentAttestationCount(address agent) external view returns (uint256) {
        return agentAttestations[agent].length;
    }

    /**
     * @notice Get all attestation IDs for an agent.
     */
    function getAgentAttestationIds(address agent) external view returns (uint256[] memory) {
        return agentAttestations[agent];
    }

    /**
     * @notice Get an agent's verification track record.
     * @return attestationCount Total number of attestations
     * @return passCount Number of PASS decisions
     * @return rejectCount Number of REJECT decisions
     * @return nodesChecked Sum of all nodes across all attestations
     * @return nodesPassed Sum of passed nodes across all attestations
     */
    function getAgentReputation(address agent) external view returns (
        uint256 attestationCount,
        uint256 passCount,
        uint256 rejectCount,
        uint256 nodesChecked,
        uint256 nodesPassed
    ) {
        uint256[] storage ids = agentAttestations[agent];
        attestationCount = ids.length;

        for (uint256 i = 0; i < ids.length; i++) {
            Attestation storage a = attestations[ids[i]];
            if (a.decision == 1) {
                passCount++;
            } else {
                rejectCount++;
            }
            nodesChecked += uint256(a.passedNodes) + uint256(a.failedNodes) + uint256(a.skippedNodes);
            nodesPassed += uint256(a.passedNodes);
        }
    }

    /**
     * @notice Get the total number of attestations in the registry.
     */
    function totalAttestations() external view returns (uint256) {
        return attestations.length;
    }
}
