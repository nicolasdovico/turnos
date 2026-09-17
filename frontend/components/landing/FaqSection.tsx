"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { LANDING_CONFIG } from "@/lib/landingConfig";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1 text-xs font-bold text-slate-700 mb-3">
          <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Resolvemos tus Dudas</span>
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Preguntas Frecuentes de Dueños de Clubes
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600">
          Todo lo que necesitás saber antes de comenzar tus 30 días de prueba gratuita.
        </p>
      </div>

      <div className="space-y-3">
        {LANDING_CONFIG.faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all duration-200 shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <span className="font-bold text-slate-900 text-sm sm:text-base">
                  {faq.pregunta}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-emerald-600" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-6 sm:px-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4 animate-fadeIn">
                  {faq.respuesta}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
