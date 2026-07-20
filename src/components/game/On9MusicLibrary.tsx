import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Button } from "@cloudflare/kumo/components/button";
import { Checkbox } from "@cloudflare/kumo/components/checkbox";
import { Input } from "@cloudflare/kumo/components/input";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Select } from "@cloudflare/kumo/components/select";
import { Text } from "@cloudflare/kumo/components/text";
import {
  chartExists,
  chartRating,
  diffLabel,
  fmtScore,
  formatLv,
  playTime,
  rank,
  score,
  type OngekiMusicMetaLite,
} from "../../lib/on9PlaylogView";
import { imgCross } from "../../lib/imgSign";
import { musicJacketUrl } from "../../lib/musicCover";
import { buildPageNumbers } from "../../lib/pagination";
import { getAppTexts } from "../../content/texts";
import type { GamePlayRecord, OngekiUserMusicDetail } from "../../lib/types";

const PAGE_SIZE = 12;
const DIFF_IDS = [0, 1, 2, 3, 4] as const;

type SongRow = {
  musicId: number;
  meta: OngekiMusicMetaLite;
  bestMap: Map<number, OngekiUserMusicDetail>;
  bestPlayMap: Map<number, GamePlayRecord>;
  playCount: number;
  search: string;
};

function genreOf(meta: OngekiMusicMetaLite): string {
  return meta.genre?.trim() ?? "";
}

function versionOf(meta: OngekiMusicMetaLite): string {
  return String(meta.versionKey ?? "").trim();
}

function orderedGenres(rows: SongRow[], ordered: string[]): string[] {
  const set = new Set<string>();
  rows.forEach((row) => {
    const g = genreOf(row.meta);
    if (g) set.add(g);
  });
  const extra = [...set].filter((one) => !ordered.includes(one)).sort();
  return [...ordered.filter((one) => set.has(one)), ...extra];
}

function orderedVersions(rows: SongRow[]): string[] {
  const set = new Set<string>();
  rows.forEach((row) => {
    const v = versionOf(row.meta);
    if (v) set.add(v);
  });
  return [...set].sort((a, b) => parseFloat(b) - parseFloat(a));
}

export function On9MusicLibrary({
  musicById,
  detailRows,
  records = [],
  loading = false,
  error = null,
  locale = "zh",
}: {
  musicById: Record<number, OngekiMusicMetaLite>;
  detailRows: OngekiUserMusicDetail[];
  records?: GamePlayRecord[];
  loading?: boolean;
  error?: string | null;
  locale?: "zh" | "en";
}) {
  const texts = getAppTexts(locale);
  const [key, setKey] = useState("");
  const [onlyPlayed, setOnlyPlayed] = useState(false);
  const [genre, setGenre] = useState("");
  const [diff, setDiff] = useState("");
  const [version, setVersion] = useState("");
  const [page, setPage] = useState(1);
  const [pickMusicId, setPickMusicId] = useState<number | null>(null);
  const keySlow = useDeferredValue(key.trim().toLowerCase());

  const rows = useMemo(() => {
    const bestBySong = new Map<number, Map<number, OngekiUserMusicDetail>>();
    const bestPlayBySong = new Map<number, Map<number, GamePlayRecord>>();
    const countBySong = new Map<number, number>();

    for (const row of detailRows) {
      const musicId = Number(row.musicId);
      if (!Number.isFinite(musicId)) continue;
      const diffId = Math.max(0, Number(row.level ?? 0));
      const scoreNow = Number(row.techScoreMax ?? 0);
      const bestMap =
        bestBySong.get(musicId) ?? new Map<number, OngekiUserMusicDetail>();
      const old = bestMap.get(diffId);
      const oldScore = Number(old?.techScoreMax ?? -1);
      if (!old || scoreNow > oldScore) bestMap.set(diffId, row);
      bestBySong.set(musicId, bestMap);
      countBySong.set(
        musicId,
        (countBySong.get(musicId) ?? 0) + Number(row.playCount ?? 0),
      );
    }

    for (const row of records) {
      const musicId = Number(row.musicId);
      if (!Number.isFinite(musicId)) continue;
      const diffId = Math.max(0, Number(row.level ?? 0));
      const scoreNow = score(row);
      const bestMap =
        bestPlayBySong.get(musicId) ?? new Map<number, GamePlayRecord>();
      const old = bestMap.get(diffId);
      const oldScore = old ? score(old) : -1;
      const time = playTime(row);
      const oldTime = old ? playTime(old) : "";
      if (
        !old ||
        scoreNow > oldScore ||
        (scoreNow === oldScore && time > oldTime)
      ) {
        bestMap.set(diffId, row);
      }
      bestPlayBySong.set(musicId, bestMap);
    }

    return Object.entries(musicById)
      .map(([id, meta]) => {
        const musicId = parseInt(id, 10);
        const search =
          `${musicId} ${meta.name ?? ""} ${meta.composer ?? ""} ${versionOf(meta)}`.toLowerCase();
        return {
          musicId,
          meta,
          bestMap: bestBySong.get(musicId) ?? new Map<number, OngekiUserMusicDetail>(),
          bestPlayMap: bestPlayBySong.get(musicId) ?? new Map<number, GamePlayRecord>(),
          playCount: countBySong.get(musicId) ?? 0,
          search,
        } satisfies SongRow;
      })
      .sort((a, b) => a.musicId - b.musicId);
  }, [detailRows, musicById, records]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (onlyPlayed && row.playCount <= 0) return false;
      if (genre && genreOf(row.meta) !== genre) return false;
      if (version && versionOf(row.meta) !== version) return false;
      if (diff && !chartExists(row.meta, Number(diff))) return false;
      if (!keySlow) return true;
      return row.search.includes(keySlow);
    });
  }, [diff, genre, keySlow, onlyPlayed, rows, version]);

  const genreList = useMemo(() => orderedGenres(rows, texts.on9MusicLibrary.genreOrder), [rows, texts.on9MusicLibrary.genreOrder]);
  const versionList = useMemo(() => orderedVersions(rows), [rows]);

  const totalPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const list = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const picked =
    filtered.find((row) => row.musicId === pickMusicId) ??
    filtered[0] ??
    null;
  const pickedDiffs = useMemo(() => {
    if (!picked) return [] as number[];
    const diffSet = new Set<number>();
    DIFF_IDS.forEach((idx) => {
      if (chartExists(picked.meta, idx) || picked.bestMap.has(idx)) diffSet.add(idx);
    });
    return [...diffSet].sort((a, b) => a - b);
  }, [picked]);

  useEffect(() => {
    setPage(1);
  }, [diff, genre, keySlow, onlyPlayed, version]);

  useEffect(() => {
    if (page > totalPage) setPage(totalPage);
  }, [page, totalPage]);

  useEffect(() => {
    if (!picked) {
      setPickMusicId(null);
      return;
    }
    if (pickMusicId !== picked.musicId) setPickMusicId(picked.musicId);
  }, [pickMusicId, picked]);

  const pickCover = picked ? musicJacketUrl("ongeki", picked.musicId) : "";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
      <LayerCard className="min-w-0 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Text variant="heading3">{texts.on9MusicLibrary.title}</Text>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={texts.on9MusicLibrary.searchPlaceholder}
              />
              <Select
                value={diff}
                onValueChange={(value) => setDiff(String(value ?? ""))}
                aria-label={texts.on9MusicLibrary.diffFilter}
              >
                <Select.Option value="">{texts.on9MusicLibrary.allDiffs}</Select.Option>
                {DIFF_IDS.map((idx) => (
                  <Select.Option key={idx} value={String(idx)}>
                    {diffLabel(idx)}
                  </Select.Option>
                ))}
              </Select>
              <Select
                value={version}
                onValueChange={(value) => setVersion(String(value ?? ""))}
                aria-label={texts.on9MusicLibrary.versionFilter}
              >
                <Select.Option value="">{texts.on9MusicLibrary.allVersions}</Select.Option>
                {versionList.map((one) => (
                  <Select.Option key={one} value={one}>
                    {one}
                  </Select.Option>
                ))}
              </Select>
              <Select
                value={genre}
                onValueChange={(value) => setGenre(String(value ?? ""))}
                aria-label={texts.on9MusicLibrary.genreFilter}
              >
                <Select.Option value="">{texts.on9MusicLibrary.allGenres}</Select.Option>
                {genreList.map((one) => (
                  <Select.Option key={one} value={one}>
                    {one}
                  </Select.Option>
                ))}
              </Select>
              <Checkbox
                controlFirst
                checked={onlyPlayed}
                onCheckedChange={setOnlyPlayed}
                label={texts.on9MusicLibrary.onlyPlayed}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((x) => Math.max(1, x - 1))}
            >
              {texts.common.previousPage}
            </Button>
            {buildPageNumbers(page, totalPage).map((n) => (
              <Button
                key={n}
                size="sm"
                variant={n === page ? "primary" : "secondary"}
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= totalPage}
              onClick={() => setPage((x) => Math.min(totalPage, x + 1))}
            >
              {texts.common.nextPage}
            </Button>
          </div>
        </div>

        {error ? (
          <Text DANGEROUS_className="text-kumo-danger mt-4 text-sm">
            {error}
          </Text>
        ) : null}

        <div className="mt-4 flex flex-col gap-3">
          {loading && !detailRows.length ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aq-skeleton h-24 rounded-xl" />
            ))
          ) : list.length ? (
            list.map((row) => {
              const cover = musicJacketUrl("ongeki", row.musicId);
              return (
                <button
                  key={row.musicId}
                  type="button"
                  onClick={() => setPickMusicId(row.musicId)}
                  className={`border-kumo-line rounded-xl border p-3 text-left transition-colors ${
                    row.musicId === picked?.musicId
                      ? "bg-kumo-fill"
                      : "bg-kumo-recessed hover:bg-kumo-tint"
                  }`}
                >
                  <div className="flex gap-3">
                    <img
                      src={cover}
                      crossOrigin={imgCross(cover)}
                      alt=""
                      width={60}
                      height={60}
                      loading="lazy"
                      decoding="async"
                      className="h-[60px] w-[60px] shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-kumo-subtle text-xs">
                          #{row.musicId}
                        </span>
                        {row.playCount > 0 ? (
                          <span className="rounded-full bg-kumo-fill px-2 py-0.5 text-xs text-kumo-brand">
                            {texts.on9MusicLibrary.playCount(row.playCount)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 truncate text-base font-semibold">
                        {row.meta.name ?? texts.common.musicWithId(row.musicId)}
                      </div>
                      <div className="text-kumo-subtle mt-1 truncate text-sm">
                        {row.meta.composer || texts.on9MusicLibrary.unknownComposer}
                      </div>
                      <div className="text-kumo-subtle mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {versionOf(row.meta) ? <span>{versionOf(row.meta)}</span> : null}
                        {genreOf(row.meta) ? <span>{genreOf(row.meta)}</span> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {DIFF_IDS.filter(
                          (idx) => chartExists(row.meta, idx) || row.bestMap.has(idx),
                        ).map((idx) => (
                          <span
                            key={`${row.musicId}-${idx}`}
                            className={`rounded-full px-2 py-1 text-xs ${
                              idx === 4
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                : "bg-kumo-base"
                            }`}
                          >
                            {diffLabel(idx)} {formatLv(row.meta, idx)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <Text DANGEROUS_className="text-kumo-subtle py-6 text-center">
              {texts.on9MusicLibrary.noMatches}
            </Text>
          )}
        </div>
      </LayerCard>

      <LayerCard className="min-w-0 p-4">
        {picked ? (
          <>
            <div className="flex gap-4">
              <img
                src={pickCover}
                crossOrigin={imgCross(pickCover)}
                alt=""
                width={112}
                height={112}
                className="h-28 w-28 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="text-kumo-subtle text-xs">
                  #{picked.musicId}
                </div>
                <Text variant="heading3" DANGEROUS_className="mt-1 break-words">
                  {picked.meta.name ?? texts.common.musicWithId(picked.musicId)}
                </Text>
                <Text DANGEROUS_className="text-kumo-subtle mt-2 text-sm">
                  {picked.meta.composer || texts.on9MusicLibrary.unknownComposer}
                </Text>
                <div className="text-kumo-subtle mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {versionOf(picked.meta) ? <span>{versionOf(picked.meta)}</span> : null}
                  {genreOf(picked.meta) ? <span>{genreOf(picked.meta)}</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-kumo-fill px-2 py-1">
                    {texts.on9MusicLibrary.totalPlays(picked.playCount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {pickedDiffs.map((idx) => {
                const best = picked.bestMap.get(idx);
                const bestPlay = picked.bestPlayMap.get(idx);
                const scoreNow = Number(best?.techScoreMax ?? 0);
                const chartRt = best
                  ? chartRating(picked.meta, idx, { techScore: scoreNow })
                  : "—";
                return (
                  <div
                    key={`${picked.musicId}-${idx}`}
                    className="border-kumo-line rounded-xl border p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{diffLabel(idx)}</div>
                        <div className="text-kumo-subtle text-xs">
                          Lv {formatLv(picked.meta, idx)}
                        </div>
                      </div>
                      {best ? (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {best.isAllBreake ? (
                            <span className="rounded-full bg-sky-500/15 px-2 py-1 text-sky-700 dark:text-sky-300">
                              AB
                            </span>
                          ) : null}
                          {best.isFullCombo ? (
                            <span className="rounded-full bg-kumo-fill px-2 py-1 text-kumo-brand">
                              FC
                            </span>
                          ) : null}
                          {best.isFullBell ? (
                            <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-700 dark:text-amber-300">
                              FB
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {best ? (
                      <div className="mt-3 space-y-2">
                        <div className="rounded-lg bg-kumo-recessed p-3">
                          <div className="grid grid-cols-[84px_1fr] gap-2 text-sm sm:grid-cols-[96px_1fr]">
                            <div className="text-kumo-subtle">{texts.on9MusicLibrary.bestScore}</div>
                            <div className="font-semibold">
                              {fmtScore(scoreNow)} · {rank(scoreNow)}
                            </div>
                            <div className="text-kumo-subtle">{texts.on9MusicLibrary.chartRating}</div>
                            <div className="font-semibold">{chartRt}</div>
                            <div className="text-kumo-subtle">{texts.on9MusicLibrary.plays}</div>
                            <div>{best.playCount ?? 0}</div>
                            <div className="text-kumo-subtle">{texts.on9MusicLibrary.battleScore}</div>
                            <div>{best.battleScoreMax ?? "—"}</div>
                            <div className="text-kumo-subtle">{texts.on9MusicLibrary.platinumScore}</div>
                            <div>{best.platinumScoreMax ?? "—"}</div>
                            <div className="text-kumo-subtle">{texts.on9MusicLibrary.maxCombo}</div>
                            <div>{best.maxComboCount ?? "—"}</div>
                            <div className="text-kumo-subtle">{texts.on9MusicLibrary.miss}</div>
                            <div>{bestPlay?.judgeMiss ?? "—"}</div>
                            <div className="text-kumo-subtle">{texts.on9MusicLibrary.criticalBreak}</div>
                            <div>{bestPlay?.judgeCriticalBreak ?? "—"}</div>
                            <div className="text-kumo-subtle">{texts.on9MusicLibrary.break}</div>
                            <div>{bestPlay?.judgeBreak ?? "—"}</div>
                            <div className="text-kumo-subtle">{texts.on9MusicLibrary.bell}</div>
                            <div>
                              {bestPlay
                                ? `${bestPlay.bellCount ?? 0}/${bestPlay.totalBellCount ?? 0}`
                                : "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Text DANGEROUS_className="text-kumo-subtle mt-3 text-sm">
                        {texts.on9MusicLibrary.noRecord}
                      </Text>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <Text DANGEROUS_className="text-kumo-subtle">{texts.on9MusicLibrary.pickSong}</Text>
        )}
      </LayerCard>
    </div>
  );
}
