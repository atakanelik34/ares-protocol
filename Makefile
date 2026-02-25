SHELL := /bin/zsh

.PHONY: setup build test dev contracts-setup contracts-test contracts-deploy-sepolia contracts-refresh-addresses demo-sepolia demo-live-seed demo-live-stream api-dev dash-dev subgraph-dev subgraph-sync

setup:
	npm install

contracts-setup:
	cd contracts && forge install openzeppelin/openzeppelin-contracts@v4.9.6 --no-git && forge install foundry-rs/forge-std@v1.9.4 --no-git

build:
	npm run build

test:
	npm run test

contracts-test:
	cd contracts && forge test -vv

contracts-deploy-sepolia:
	bash ./deploy/contracts/deploy-base-sepolia.sh

contracts-refresh-addresses:
	node ./deploy/contracts/refresh-addresses-from-latest.mjs

demo-sepolia:
	node ./deploy/contracts/run-demo-sepolia.mjs

demo-live-seed:
	npm run demo:seed:live

demo-live-stream:
	npm run demo:stream:actions

api-dev:
	npx npm-run-all --parallel dev:query dev:scoring

dash-dev:
	npx npm-run-all --parallel dev:agent-explorer dev:protocol-admin

subgraph-dev:
	npm --workspace subgraph run codegen && npm --workspace subgraph run build

subgraph-sync:
	node ./deploy/contracts/update-subgraph-addresses.mjs --addresses ./deploy/contracts/addresses.base-sepolia.json --manifest ./subgraph/subgraph.yaml --network base-sepolia

dev:
	npm run dev
