import { BigInt } from '@graphprotocol/graph-ts';
import {
  AgentRegistered
} from '../generated/AresRegistry/AresRegistry';
import { ActionScored, ActionInvalidated } from '../generated/AresScorecardLedger/AresScorecardLedger';
import { ARIUpdated } from '../generated/AresARIEngine/AresARIEngine';
import { DisputeOpened, DisputeFinalized } from '../generated/AresDispute/AresDispute';
import { ApiAccessPurchased } from '../generated/AresApiAccess/AresApiAccess';
import { Agent, ActionScore, AgentARI, Dispute, ApiAccess } from '../generated/schema';

function getOrCreateAgent(id: string): Agent {
  let agent = Agent.load(id);
  if (agent == null) {
    agent = new Agent(id);
    agent.canonicalAgentId = BigInt.zero();
    agent.wallets = [];
    agent.registeredAt = BigInt.zero();
    agent.ari = BigInt.zero();
    agent.tier = 'UNVERIFIED';
    agent.validActionsCount = BigInt.zero();
    agent.firstActionAt = BigInt.zero();
    agent.updatedAt = BigInt.zero();
  }
  return agent;
}

function tierName(value: i32): string {
  if (value == 0) return 'UNVERIFIED';
  if (value == 1) return 'PROVISIONAL';
  if (value == 2) return 'ESTABLISHED';
  if (value == 3) return 'TRUSTED';
  return 'ELITE';
}

export function handleAgentRegistered(event: AgentRegistered): void {
  const agentId = event.params.agentId.toString();
  const agent = getOrCreateAgent(agentId);
  agent.canonicalAgentId = event.params.agentId;
  agent.operator = event.params.operator;
  agent.registeredAt = event.block.timestamp;
  agent.updatedAt = event.block.timestamp;
  agent.save();
}

export function handleActionScored(event: ActionScored): void {
  const agentId = event.params.agent.toString();
  const entityId = agentId.concat('-').concat(event.params.actionId.toHexString());
  const score = new ActionScore(entityId);

  const agent = getOrCreateAgent(agentId);
  score.agent = agent.id;
  score.actionId = event.params.actionId;
  score.score0 = event.params.scores[0];
  score.score1 = event.params.scores[1];
  score.score2 = event.params.scores[2];
  score.score3 = event.params.scores[3];
  score.score4 = event.params.scores[4];
  score.timestamp = BigInt.fromString(event.params.timestamp.toString());
  score.scorer = event.params.scorer;
  score.status = 'VALID';
  score.save();

  agent.updatedAt = event.block.timestamp;
  agent.save();
}

export function handleActionInvalidated(event: ActionInvalidated): void {
  const agentId = event.params.agentId.toString();
  const entityId = agentId.concat('-').concat(event.params.actionId.toHexString());
  let score = ActionScore.load(entityId);
  if (score == null) {
    score = new ActionScore(entityId);
    score.agent = agentId;
    score.actionId = event.params.actionId;
    score.score0 = 0;
    score.score1 = 0;
    score.score2 = 0;
    score.score3 = 0;
    score.score4 = 0;
    score.timestamp = event.block.timestamp;
    score.scorer = event.transaction.from;
  }
  score.status = 'INVALID';
  score.save();
}

export function handleARIUpdated(event: ARIUpdated): void {
  const agentId = event.params.agentId.toString();
  const agent = getOrCreateAgent(agentId);

  const ariId = agentId;
  const ari = new AgentARI(ariId);
  ari.agent = agent.id;
  ari.ari = event.params.ari;
  ari.tier = tierName(event.params.tier);
  ari.validActionsCount = event.params.actionsCount;
  ari.updatedAt = event.block.timestamp;
  ari.save();

  agent.ari = event.params.ari;
  agent.tier = tierName(event.params.tier);
  agent.validActionsCount = event.params.actionsCount;
  agent.updatedAt = event.block.timestamp;
  agent.save();
}

export function handleDisputeOpened(event: DisputeOpened): void {
  const id = event.params.disputeId.toString();
  const d = new Dispute(id);
  d.agent = event.params.agent.toString();
  d.actionId = event.params.actionId;
  d.challenger = event.params.challenger;
  d.save();
}

export function handleDisputeFinalized(event: DisputeFinalized): void {
  const id = event.params.disputeId.toString();
  let d = Dispute.load(id);
  if (d == null) return;
  d.accepted = event.params.accepted;
  d.finalizedAt = event.block.timestamp;
  d.save();
}

export function handleApiAccessPurchased(event: ApiAccessPurchased): void {
  const id = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString());
  const access = new ApiAccess(id);
  access.account = event.params.recipient;
  access.planId = event.params.planId;
  access.expiry = BigInt.fromString(event.params.expiry.toString());
  access.purchasedAt = event.block.timestamp;
  access.save();
}
