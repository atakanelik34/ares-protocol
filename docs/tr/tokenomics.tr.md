# Tokenomics Notlari

## $ARES utility
- Agent kaydi icin stake
- Dispute katilimi ve slashing ekonomisi
- Governance oylamasi
- Opsiyonel ucretli API erisimi (ARES extension)

## Arz politikasi
- Local/demo modunda `initialSupply = 0` ve script tabanli mint kullanilabilir.
- Mainnet/TGE arz, vesting ve allocation parametreleri audit + governance sonrasinda finalize edilir.
- Dagitim yuzdeleri core kontratlara hardcode edilmez.

## Governance entegrasyonu
- Token, on-chain governance icin `ERC20Votes` kullanir.
- Governor + Timelock, protokol parametre degisikliklerini yonetir.

## API utility aciklamasi
Ucretli API erisimi bir ARES extension'idir (`AresApiAccess`) ve ERC-8004 standardinin zorunlu parcasi degildir.
