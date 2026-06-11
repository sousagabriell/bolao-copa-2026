"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Match, Prediction, translateTeamName } from "@/lib/types";
import { submitPrediction, getMatchPredictions, MatchPredictionEntry } from "./actions";
import { toast } from "sonner";
import { Pencil, Check, X, MapPin, Users, Loader2 } from "lucide-react";

interface Props {
    match: Match;
    prediction: Prediction | undefined;
    started: boolean;
    started10min: boolean;
    formattedDate: string;
}

export default function PalpitesClient({ match, prediction, started, started10min, formattedDate }: Props) {
    const [home, setHome] = useState<string>(
        prediction?.home_score_pred !== undefined ? String(prediction.home_score_pred) : ""
    );
    const [away, setAway] = useState<string>(
        prediction?.away_score_pred !== undefined ? String(prediction.away_score_pred) : ""
    );
    const [editing, setEditing] = useState(!prediction && !started);
    const [isPending, startTransition] = useTransition();
    const [showModal, setShowModal] = useState(false);
    const [loadingPredictions, setLoadingPredictions] = useState(false);
    const [allPredictions, setAllPredictions] = useState<MatchPredictionEntry[] | null>(null);

    async function handleShowPredictions() {
        setShowModal(true);
        if (allPredictions !== null) return;
        setLoadingPredictions(true);
        try {
            const data = await getMatchPredictions(match.id);
            setAllPredictions(data);
        } catch {
            toast.error("Não foi possível carregar os palpites.");
            setShowModal(false);
        }
        setLoadingPredictions(false);
    }

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
                    {started10min && (
                        <button
                            onClick={handleShowPredictions}
                            className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white/60 hover:text-white px-2 py-0.5 rounded-full transition-colors border border-white/10"
                        >
                            <Users size={11} />
                            Ver palpites
                        </button>
                    )}
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

            {/* Modal palpites do bolão */}
            {showModal && (
                <div className="fixed inset-0 z-[60]" onClick={() => setShowModal(false)}>
                    <div className="absolute inset-0 bg-black/70" />
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-copa-dark-800 rounded-t-2xl border-t border-white/10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-5 pt-5 pb-4 border-b border-white/5">
                            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-white">Palpites do bolão</h3>
                                    <p className="text-xs text-white/40 mt-0.5">
                                        {translateTeamName(match.home_team)} × {translateTeamName(match.away_team)}
                                    </p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white p-1">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div style={{ maxHeight: '60vh', overflowY: 'scroll' }} className="px-5 py-4 pb-8">
                            {loadingPredictions ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 size={24} className="text-copa-red animate-spin" />
                                </div>
                            ) : allPredictions && allPredictions.length === 0 ? (
                                <p className="text-center text-white/30 text-sm py-10">Nenhum palpite registrado.</p>
                            ) : (
                                <div className="space-y-2">
                                    {(allPredictions ?? []).map((p, i) => {
                                        const name = p.profiles?.name ?? "Participante";
                                        const avatar = p.profiles?.avatar_url;
                                        return (
                                            <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                                                {/* Avatar */}
                                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 bg-copa-dark-700 flex items-center justify-center">
                                                    {avatar ? (
                                                        <Image src={avatar} alt={name} width={32} height={32} className="object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-bold text-white">{name.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                {/* Nome */}
                                                <span className="flex-1 text-sm text-white truncate">{name}</span>
                                                {/* Palpite */}
                                                <span className="text-sm font-bold text-white bg-white/10 rounded-lg px-3 py-1">
                                                    {p.home_score_pred} × {p.away_score_pred}
                                                </span>
                                                {/* Pontos */}
                                                {p.points !== null && p.points !== undefined && (
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                        p.points === 3 ? "bg-copa-gold/20 text-copa-gold border border-copa-gold/30" :
                                                        p.points === 1 ? "bg-blue-500/20 text-blue-400 border border-blue-400/30" :
                                                        "bg-red-500/20 text-red-400 border border-red-400/30"
                                                    }`}>
                                                        {p.points === 3 ? "+3" : p.points === 1 ? "+1" : "+0"}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}