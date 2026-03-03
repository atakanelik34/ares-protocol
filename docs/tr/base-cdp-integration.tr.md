# Base/CDP Entegrasyon Notu

## Kapsam
Bu not, ARES'in Base üzerindeki canlı dağıtım yüzeyi ile Coinbase Developer Platform (CDP) operasyon kontrollerini nasıl birleştirdiğini açıklar.

## Bugün Canlı Olanlar
- Landing URL: `https://ares-protocol.xyz/`
- API tabanı: `https://ares-protocol.xyz/api`
- Explorer: `https://app.ares-protocol.xyz/`
- Ağ: Base Sepolia (demo/testnet ortamı)

## Base Çalışma Yüzeyi Doğrulaması
ARES çalışma yüzeyleri izlenebilir ve herkese açık şekilde erişilebilirdir:
- Landing: `https://ares-protocol.xyz/`
- Explorer: `https://app.ares-protocol.xyz/`
- API health: `https://ares-protocol.xyz/api/v1/health`

## CDP Operasyon Uyum Katmanı
- API key yaşam döngüsü ve proje seviyesinde kontroller CDP proje yönetimi ile yürütülür.
- Faturalama görünürlüğü ve ekip erişim kontrolü aynı çalışma alanında takip edilir.
- Bu katman operasyon katmanıdır; ARES'in on-chain otorite modelini değiştirmez.

## Güvenlik Sınırı
- Çekirdek protokol otoritesi on-chain kalır (governance/timelock/contracts).
- Adapter sahipliği veya web sahipliği canonical core registry otoritesini geçersiz kılamaz.
- Mainnet geçişi audit kapanışı, governance hazırlığı ve runbook onayı olmadan açılmaz.

## İlgili Linkler
- Entegrasyon kılavuzu: `/docs/tr/integration-guide.tr.md`
- Güvenlik modeli: `/docs/tr/security.tr.md`
- Production runtime ve deploy prosedürleri private operational repositories içinde tutulur.
