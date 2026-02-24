# Tokenomics Notları

## $ARES utility
- Agent kaydı için stake
- Dispute katılımı ve slashing ekonomisi
- Governance oylaması
- Opsiyonel ücretli API erişimi (ARES extension)

## Arz politikası
- Local/demo modunda `initialSupply = 0` ve script tabanlı mint kullanılabilir.
- Mainnet/TGE arz, vesting ve allocation parametreleri audit + governance sonrasında finalize edilir.
- Dağıtım yüzdeleri core kontratlarda hardcode edilmez.

## Governance entegrasyonu
- Token, on-chain governance için `ERC20Votes` kullanır.
- Governor + Timelock, protokol parametre değişikliklerini yönetir.

## API utility açıklaması
Ücretli API erişimi bir ARES extension'ıdır (`AresApiAccess`) ve ERC-8004 standardının bir gerekliliği değildir.
