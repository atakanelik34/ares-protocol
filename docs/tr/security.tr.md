# Güvenlik Modeli

## Core kontrolleri
- Sybil maliyeti için stake-gated kayıt.
- Authorized scorer + EIP-712 imza doğrulaması.
- Skor aralığı zorlaması (boyut başına 0..200).
- Skor bütünlüğü için dispute + slashing.

## Governance kontrolleri
- Parametre güncellemeleri yalnızca timelock'lu governance üzerinden yapılır.
- Lambda, decay tablosu, min stake, scorer yetkileri ve dispute parametreleri governance ile yönetilir.

## API auth kontrolleri
- Ücretli erişim için challenge/verify imza akışı.
- Tek kullanımlık nonce + TTL (varsayılan 5 dakika).
- Verify sonrası nonce invalidation zorunludur.
- Session token mint edilmeden önce opsiyonel/zorunlu on-chain `AresApiAccess.accessExpiry` kontrolü.
- Ücretli erişim açıkken session süresi on-chain access expiry süresini geçemez.

## Dispute düzeltme kontrolleri
- Aksiyon seviyesinde invalidation ve deterministik correction.
- Replay ile şişirmeyi engellemek için `validActionsCount`, `totalActionsCount`'tan ayrıdır.

## Açık Kalan Başlıklar
- Harici audit round-1 tamamlandı; deployment hedefinde bağımsız closure attestation hâlâ açık.
- Production anti-bot/captcha politika tuning'i açık.
- Webhook migration hedef durumu (`hmac`-only) henüz tam enforce edilmedi; geçişte `dual` mod aktif.
