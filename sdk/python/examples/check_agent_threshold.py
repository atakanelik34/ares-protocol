from ares_sdk import AresClient

THRESHOLD = 600
ADDRESS = "0x0000000000000000000000000000000000000000"


def main() -> None:
    client = AresClient("http://localhost:3001")
    score = client.get_score(ADDRESS)

    if score.ari >= THRESHOLD:
        print(f"Agent {ADDRESS} passes threshold with ARI={score.ari}")
    else:
        print(f"Agent {ADDRESS} below threshold: ARI={score.ari}")


if __name__ == "__main__":
    main()
