SHELL := /bin/zsh

.PHONY: setup build test dev contracts-setup contracts-test api-dev dash-dev subgraph-dev

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

api-dev:
	npx npm-run-all --parallel dev:query dev:scoring

dash-dev:
	npx npm-run-all --parallel dev:agent-explorer dev:protocol-admin

subgraph-dev:
	npm --workspace subgraph run codegen && npm --workspace subgraph run build

dev:
	npm run dev
