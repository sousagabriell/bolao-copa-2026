"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Match, Prediction } from "@/lib/types";
import { submitPrediction } from "./actions";

interface Props {
  match: Match;
  prediction: Prediction | undefined;
  started: boolean;
  formattedDate: string;
}

export default function PalpitesClient({ match, prediction, started, formattedDate }: Props) {
  const [home, setHome] = useState<string>(
    prediction?.home_score_pred !== undefined ? String(prediction.home_score_pred) : ""
  );
  const [away, setAway] = useState<string>(
    prediction?.away_score_pred !== undefined ? String(prediction.away_score_pred) : ""
  );
  const [saved, setSaved] = useState(!!prediction);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const h = parseInt(home);
    const a = parseInt(away);
    if (isNaN(h) || isNaN(a)) return;

    startTransition(async () => {
      await submitPrediction(match.id, h, a);
      setSaved(true);
    });
  }

  const finished = match.status === "FINISHED";
  const live = match.status === "IN_PLAY" || match.status === "PAUSED";

  return (
    <div className={`bg-white rounded-xl shadow-sm border mb-3 px-4 py-3 ${live ? "border-green-400" : "border-gray-100"}`}>
      {/* Data e estádio */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-400">{formattedDate}</span>
        <div className="flex items-center gap-1">
          {live && (
            <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full animate-pulse">
              AO VIVO
            </span>
          )}
          {finished && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              Encerrado
            </span>
          )}
          {prediction?.points !== null && prediction?.points !== undefined && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              prediction.points === 3 ? "bg-yellow-100 text-yellow-700" :
              prediction.points === 1 ? "bg-blue-100 text-blue-700" :
              "bg-red-100 text-red-600"
            }`}>
              {prediction.points === 3 ? "⭐ +3" : prediction.points === 1 ? "+1" : "+0"}
            </span>
          )}
        </div>
      </div>

      {/* Times e placar */}
      <div className="flex items-center justify-between gap-2">
        {/* Time da casa */}
        <div className="flex-1 flex flex-col items-center gap-1">
          {match.home_team_crest && (
            <Image src={match.home_team_crest} alt={match.home_team} width={32} height={32} className="object-contain" />
          )}
          <span className="text-xs font-semibold text-gray-800 text-center leading-tight">
            {match.home_team}
          </span>
        </div>

        {/* Placar e inputs */}
        <div className="flex flex-col items-center gap-1">
          {/* Resultado real (se jogo terminado) */}
          {(finished || live) && match.home_score !== null && (
            <div className="flex items-center gap-1.5 text-base font-bold text-gray-900">
              <span>{match.home_score}</span>
              <span className="text-gray-400">×</span>
              <span>{match.away_score}</span>
            </div>
          )}

          {/* Inputs de palpite */}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={99}
              disabled={started}
              value={home}
              onChange={(e) => { setHome(e.target.value); setSaved(false); }}
              className="w-10 h-10 text-center text-base font-bold border-2 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:border-green-500 border-gray-300"
            />
            <span className="text-gray-500 font-bold">×</span>
            <input
              type="number"
              min={0}
              max={99}
              disabled={started}
              value={away}
              onChange={(e) => { setAway(e.target.value); setSaved(false); }}
              className="w-10 h-10 text-center text-base font-bold border-2 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:border-green-500 border-gray-300"
            />
          </div>

          {/* Botão salvar / status */}
          {!started ? (
            <button
              onClick={handleSave}
              disabled={isPending || home === "" || away === "" || saved}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                saved
                  ? "bg-green-100 text-green-700"
                  : "bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400"
              }`}
            >
              {isPending ? "Salvando..." : saved ? "✓ Salvo" : "Salvar"}
            </button>
          ) : !prediction ? (
            <span className="text-xs text-gray-400">Sem palpite</span>
          ) : null}
        </div>

        {/* Time visitante */}
        <div className="flex-1 flex flex-col items-center gap-1">
          {match.away_team_crest && (
            <Image src={match.away_team_crest} alt={match.away_team} width={32} height={32} className="object-contain" />
          )}
          <span className="text-xs font-semibold text-gray-800 text-center leading-tight">
            {match.away_team}
          </span>
        </div>
      </div>

      {match.stadium && (
        <p className="text-xs text-gray-400 text-center mt-2">
          📍 {match.stadium}{match.city ? `, ${match.city}` : ""}
        </p>
      )}
    </div>
  );
}
