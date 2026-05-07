"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Match, Prediction, translateTeamName } from "@/lib/types";
import { submitPrediction } from "./actions";
import { toast } from "sonner";
import { Pencil, Check, X, MapPin } from "lucide-react";

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
    const [editing, setEditing] = useState(!prediction && !started);
    const [isPending, startTransition] = useTransition();

    function handleSave() {
        const h = parseInt(home);
        const a = parseInt(away);
        if (isNaN(h) || isNaN(a)) {
            toast.error("Preencha ambos os placares.");
            return;
        }

        startTransition(async () => {
            await submitPrediction(match.id, h, a);
            setEditing(false);
            toast.success("Palpite salvo!");
        });
    }

    function handleCancel() {
        setHome(prediction?.home_score_pred !== undefined ? String(prediction.home_score_pred) : "");
        setAway(prediction?.away_score_pred !== undefined ? String(prediction.away_score_pred) : "");
        setEditing(false);
    }

    const finished = match.status === "FINISHED";
    const live = match.status === "IN_PLAY" || match.status === "PAUSED";
    const hasPrediction = prediction?.home_score_pred !== undefined;

    const pointsBadge = prediction?.points !== null && prediction?.points !== undefined ? (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${prediction.points === 3 ? "bg-copa-gold/20 text-copa-gold border border-copa-gold/30" :
                prediction.points === 1 ? "bg-blue-500/20 text-blue-400 border border-blue-400/30" :
                    "bg-red-500/20 text-red-400 border border-red-400/30"
            }`}>
            {prediction.points === 3 ? "+3 pts" : prediction.points === 1 ? "+1 pt" : "+0 pts"}
        </span>
    ) : null;

    return (
        <div className={`bg-copa-dark-800 rounded-2xl border mb-3 px-4 py-4 ${live ? "border-copa-red/60 shadow-lg shadow-copa-red/10" : "border-white/10"
            }`}>
            {/* Header: Data + badges */}
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-white/40">{formattedDate}</span>
                <div className="flex items-center gap-1.5">
                    {live && (
                        <span className="text-xs bg-copa-red/20 text-copa-red font-bold px-2 py-0.5 rounded-full animate-pulse border border-copa-red/30">
                            AO VIVO
                        </span>
                    )}
                    {finished && (
                        <span className="text-xs bg-white/10 text-white/40 px-2 py-0.5 rounded-full">
                            Encerrado
                        </span>
                    )}
                    {pointsBadge}
                </div>
            </div>

            {/* Times e placar */}
            <div className="flex items-center justify-between gap-3">
                {/* Time da casa */}
                <div className="flex-1 flex flex-col items-center gap-1.5">
                    {match.home_team_crest && (
                        <Image src={match.home_team_crest} alt={translateTeamName(match.home_team)} width={36} height={36} className="object-contain drop-shadow" />
                    )}
                    <span className="text-xs font-semibold text-white text-center leading-tight">
                        {translateTeamName(match.home_team)}
                    </span>
                </div>

                {/* Centro: Resultado real + Palpite */}
                <div className="flex flex-col items-center gap-2 min-w-[120px]">
                    {/* Resultado real */}
                    {(finished || live) && match.home_score !== null && (
                        <div className="flex items-center gap-2 text-lg font-black text-white">
                            <span>{match.home_score}</span>
                            <span className="text-white/30">–</span>
                            <span>{match.away_score}</span>
                        </div>
                    )}

                    {/* Palpite: modo leitura */}
                    {!editing && hasPrediction && (
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                                <span className="text-sm font-bold text-white">{home}</span>
                                <span className="text-white/30 text-xs">×</span>
                                <span className="text-sm font-bold text-white">{away}</span>
                            </div>
                            {!started && (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                                >
                                    <Pencil size={13} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Palpite: modo edição */}
                    {editing && !started && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="number"
                                    min={0}
                                    max={99}
                                    value={home}
                                    onChange={(e) => setHome(e.target.value)}
                                    className="w-11 h-11 text-center text-base font-bold bg-white/10 border-2 border-copa-red/60 rounded-xl text-white focus:outline-none focus:border-copa-red"
                                />
                                <span className="text-white/40 font-bold">×</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={99}
                                    value={away}
                                    onChange={(e) => setAway(e.target.value)}
                                    className="w-11 h-11 text-center text-base font-bold bg-white/10 border-2 border-copa-red/60 rounded-xl text-white focus:outline-none focus:border-copa-red"
                                />
                            </div>
                            <div className="flex gap-1.5">
                                {hasPrediction && (
                                    <button
                                        onClick={handleCancel}
                                        className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white/60 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <X size={12} />
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    disabled={isPending || home === "" || away === ""}
                                    className="flex items-center gap-1 text-xs bg-copa-red hover:bg-red-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Check size={12} />
                                    {isPending ? "Salvando..." : "Salvar"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sem palpite + jogo iniciado */}
                    {started && !hasPrediction && (
                        <span className="text-xs text-white/30">Sem palpite</span>
                    )}

                    {/* Jogo não iniciado, sem palpite, não editando */}
                    {!started && !hasPrediction && !editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="text-xs text-copa-red font-medium hover:underline"
                        >
                            + Palpitar
                        </button>
                    )}
                </div>

                {/* Time visitante */}
                <div className="flex-1 flex flex-col items-center gap-1.5">
                    {match.away_team_crest && (
                        <Image src={match.away_team_crest} alt={translateTeamName(match.away_team)} width={36} height={36} className="object-contain drop-shadow" />
                    )}
                    <span className="text-xs font-semibold text-white text-center leading-tight">
                        {translateTeamName(match.away_team)}
                    </span>
                </div>
            </div>

            {match.stadium && (
                <div className="flex items-center justify-center gap-1 mt-3">
                    <MapPin size={10} className="text-white/30" />
                    <p className="text-xs text-white/30">
                        {match.stadium}{match.city ? `, ${match.city}` : ""}
                    </p>
                </div>
            )}
        </div>
    );
}