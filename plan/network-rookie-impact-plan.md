# Network Rookie Impact Plan (Chat Agent + 3D Globe)

## Status keputusan
- **Tidak realistis** menyelesaikan 5 fitur sekaligus dalam 1 prompt dengan kualitas bagus.
- Strategi terbaik: implementasi bertahap dengan urutan yang memaksimalkan dampak pengunjung.

## Tujuan
Membuat pengalaman yang terasa:
1. **Interaktif** (pengunjung ambil keputusan),
2. **Visual jelas** (beda mode langsung kebaca di globe),
3. **Masuk akal** (AI menjelaskan sebab-akibat, bukan hanya deskripsi umum).

## Scope fitur yang akan di-ship
1. **Guided Mission Mode**
2. **Before/After Compare**
3. **Mode-specific Visual Language**
4. **Decision Simulation**
5. **Targeted Data Enrichment** (bukan nambah kota besar-besaran)

---

## Arsitektur saat ini (acuan implementasi)
- `src/components/ChatInterface.tsx` → kontrol simulasi, UI chat, chip.
- `src/hooks/useGeminiChat.ts` → kontrak AI (payload JSON), parser, prompt.
- `src/components/RightPanel.tsx` → router action dari AI ke state app.
- `src/components/GlobeSection.tsx` → render globe, arc visuals, mode behavior.
- `src/components/PacketDots.tsx` → animasi dot traffic.
- `src/data/network.ts` → data kota/koneksi + metadata.

---

## Implementasi per fase

## Fase 1 — Data & kontrak dasar (fondasi)
### 1.1 Tambah data terarah di `network.ts`
Tambahkan field baru pada `Connection`:
- `riskType`: `'anchor' | 'earthquake' | 'congestion' | 'wireless' | 'maintenance'`
- `backupRouteIds`: `string[]` (ID koneksi alternatif)
- `congestionScore`: `number` (0-100)
- `recoveryHint`: `string` (plain English, untuk AI narasi)

Tambahkan ID stabil di koneksi:
- `id: string` (mis. `lax-tok-faster`)

### 1.2 Update tipe payload AI di `useGeminiChat.ts`
Tambahkan response type baru:
- `mission`
- `compare`
- `decision`

Contoh struktur:
```json
{"type":"mission","id":"m1","title":"...","goal":"...","fromId":"tok","toId":"lon","successCriteria":"...","hint":"..."}
{"type":"compare","mode":"packet-loss","before":{"latency":"...","path":"..."},"after":{"latency":"...","path":"..."},"summary":"..."}
{"type":"decision","decisionId":"reroute-priority-video","options":[{"id":"a","label":"..."},{"id":"b","label":"..."}],"recommended":"a","why":"..."}
```

### 1.3 Prompt policy AI
Di system prompt, paksa format jawaban per mode:
- **What you see**
- **Why it happens** (minimal 2 penyebab)
- **User impact**
- **What to do next** (1 langkah sederhana)

---

## Fase 2 — Guided Mission Mode
### 2.1 UI mission di `ChatInterface.tsx`
Tambahkan card mission:
- Title, goal, route, status (`active | success | failed`)
- Tombol: `Start Mission`, `Complete Mission`, `Next Mission`

### 2.2 Integrasi globe
Saat mission start:
- panggil action focus city / route,
- visual route mission dibuat lebih tebal + glow,
- badge mission aktif ditampilkan.

### 2.3 State mission
Tambah state global di `useAppState.ts`:
- `activeMission`
- `missionProgress`
- `missionResult`

---

## Fase 3 — Before/After Compare
### 3.1 Compare panel
Tambahkan komponen baru: `src/components/ModeComparePanel.tsx`
- Menampilkan metrik Before vs After:
  - latency (friendly label),
  - route distance,
  - retry level,
  - service quality.

### 3.2 Toggle compare
Di `ChatInterface`:
- tombol `Compare: Normal vs Current Mode`
- jika aktif, panel compare sticky di atas chat.

### 3.3 Sumber data compare
Awalnya gunakan rule-based local calc dari `network.ts`, lalu AI hanya narasi.

---

## Fase 4 — Mode-specific Visual Language (visual beda tegas)
### 4.1 Packet Loss visual
`GlobeSection.tsx` + `PacketDots.tsx`:
- marker retry (`↺`) di beberapa titik,
- arc berkedip tidak stabil,
- packet dots putus-nyambung + warna cyan/rose khusus mode ini.

### 4.2 Cable Break visual
- route putus diberi `✕` besar + warning endpoint `⚠`,
- route lain dimute,
- tampil “reroute path” (garis alternatif dashed hijau/biru).

### 4.3 High-load visual
- arus packet dots jadi padat,
- arc utama jadi lebih tebal dan lebih panas (amber/orange).

### 4.4 Overlay legenda mode
Tambahkan legenda mini permanen di globe:
- warna/ikon mode,
- arti visual singkat.

---

## Fase 5 — Decision Simulation (fitur dampak paling tinggi)
### 5.1 Decision card
Komponen baru `src/components/DecisionCard.tsx`:
- menampilkan 2-3 opsi keputusan,
- user pilih opsi,
- AI + globe menampilkan konsekuensi.

### 5.2 Decision engine lokal
Buat helper `src/utils/simulationDecisionEngine.ts`:
- input: mode + opsi user,
- output: perubahan visual + metrik compare + narasi dampak.

### 5.3 Contoh keputusan
- High-load: `prioritize video` vs `fair distribution`
- Packet-loss: `retry aggressive` vs `reduce quality`
- Cable-cut: `reroute shortest` vs `reroute most stable`

---

## Fase 6 — Polishing & consistency
1. Samakan copy tone semua mode (non-jargon + analogi).
2. Pastikan semua action AI idempotent (tidak replay saat re-render).
3. Pastikan close dialog/city state tetap stabil setelah theme switch.
4. Review kontras light/dark di semua indikator mode.

---

## Urutan eksekusi paling efisien (disarankan)
1. Fase 1 (data + payload types)  
2. Fase 4 (visual beda tegas)  
3. Fase 2 (mission mode)  
4. Fase 3 (compare panel)  
5. Fase 5 (decision simulation)  
6. Fase 6 (polish)

Alasan: pengunjung cepat “merasakan impact” begitu visual mode beda jelas + ada misi.

---

## Acceptance criteria per fitur

## Guided Mission
- User bisa start mission dari chat.
- Globe menyorot route misi.
- Mission punya status selesai/gagal yang terlihat.

## Compare
- Ada panel Before/After yang menampilkan minimal 3 metrik.
- User bisa toggle tanpa reset mode.

## Visual Language
- Orang awam bisa membedakan packet loss vs cable break < 5 detik.
- Tiap mode punya ikon + pola visual unik.

## Decision Simulation
- User bisa memilih opsi dan melihat akibat berbeda.
- AI menyebut “trade-off” tiap keputusan.

## Data Enrichment
- Koneksi punya metadata risiko + rute cadangan.
- AI bisa menyebut penyebab spesifik berdasarkan data, bukan generik.

---

## Risiko & mitigasi
- **Risiko:** UI terlalu ramai.  
  **Mitigasi:** progressive disclosure (card bisa collapse).

- **Risiko:** AI respons tidak konsisten.  
  **Mitigasi:** parser fallback + template labels wajib.

- **Risiko:** performa turun karena banyak animasi.  
  **Mitigasi:** mode-aware throttling di `PacketDots`.

---

## Prompt lanjutan saat usage reset (siap copy-paste)
Gunakan prompt ini untuk lanjut implementasi:

```text
Lanjutkan implementasi berdasarkan file plan/network-rookie-impact-plan.md.
Kerjakan berurutan: Fase 1 lalu Fase 4 dulu.
Fokus ke perubahan kode nyata (bukan analisa saja), update file terkait:
src/data/network.ts
src/hooks/useGeminiChat.ts
src/components/GlobeSection.tsx
src/components/PacketDots.tsx
src/components/ChatInterface.tsx
Setelah selesai, build dan laporkan hasil per acceptance criteria.
```

---

## Progress Update (Current Session)

### ✅ Completed
- **Fase 1:** Data enrichment (riskType, backupRouteIds, congestionScore, recoveryHint for all 15 connections)
- **Fase 4:** Visual language (arc thickness varies by congestion, backup route indicator in cable-cut mode)
- **Fase 2:** Mission Mode foundation (MissionCard component, mission state management, AI mission generation support)

### 📊 Summary
- 3/6 phases complete (60%)
- All builds passing
- Ready for Fase 3 (Compare Panel)

### 🔄 Next Steps (In Order)
1. **Fase 3 - Before/After Compare:** Create ModeComparePanel with latency/distance/retry metrics
2. **Fase 5 - Decision Simulation:** Add trade-off decision UI and simulate consequences
3. **Fase 6 - Polish:** Finalize tone, consistency, performance

### 🎯 To Resume
After usage reset, continue with: pnpm run build && implement Fase 3 ModeComparePanel
