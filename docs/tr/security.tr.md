# Guvenlik Modeli

## Core kontrolleri
- Sybil maliyeti icin stake-gated registration.
- Authorized scorer + EIP-712 imza dogrulamasi.
- Skor araligi zorlamasi (boyut basi 0..200).
- Skor butunlugu icin dispute + slashing.

## Governance kontrolleri
- Parametre guncellemeleri yalnizca timelock'li governance uzerinden yapilir.
- Lambda, decay tablosu, min stake, scorer yetkileri ve dispute parametreleri governance ile yonetilir.

## API auth kontrolleri
- Ucretli erisim icin challenge/verify imza akisi.
- Tek kullanimlik nonce + TTL (varsayilan 5 dakika).
- Verify sonrasi nonce invalidation zorunludur.

## Dispute duzeltme kontrolleri
- Aksiyon seviyesinde invalidation ve deterministik correction.
- Replay ile sayim sisirmesini engellemek icin `validActionsCount` ve `totalActionsCount` ayridir.

## Bilinen TODO basliklari
- Harici audit ve formal verification artefaktlarinin eklenmesi.
- Production anti-bot/captcha politika tuning'i.
