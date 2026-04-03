import React from 'react';
import { cn } from '../lib/utils';
import { Armchair, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface BusSeatPickerProps {
  totalSeats: number;
  bookedSeats: number[];
  selectedSeats: number[];
  onSeatToggle: (seatNumber: number) => void;
}

export default function BusSeatPicker({
  totalSeats,
  bookedSeats,
  selectedSeats,
  onSeatToggle,
}: BusSeatPickerProps) {
  const rows = Math.ceil(totalSeats / 4);
  
  return (
    <div className="bg-[#111] p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
      {/* Decorative Elements */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-600/10 blur-[100px] rounded-full" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-600/10 blur-[100px] rounded-full" />

      <div className="relative z-10">
        {/* Cockpit Area */}
        <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
              <div className="w-8 h-8 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-widest">قمرة القيادة</div>
              <div className="text-sm font-black text-white">نظام التوجيه الذكي</div>
            </div>
          </div>
          <ShieldCheck className="w-8 h-8 text-emerald-500/50" />
        </div>

        {/* Bus Body */}
        <div className="flex flex-col gap-4 max-w-xs mx-auto">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex justify-between items-center gap-4">
              <div className="flex gap-2">
                <Seat
                  number={rowIndex * 4 + 1}
                  isBooked={bookedSeats.includes(rowIndex * 4 + 1)}
                  isSelected={selectedSeats.includes(rowIndex * 4 + 1)}
                  onClick={() => onSeatToggle(rowIndex * 4 + 1)}
                />
                <Seat
                  number={rowIndex * 4 + 2}
                  isBooked={bookedSeats.includes(rowIndex * 4 + 2)}
                  isSelected={selectedSeats.includes(rowIndex * 4 + 2)}
                  onClick={() => onSeatToggle(rowIndex * 4 + 2)}
                />
              </div>

              {/* Aisle */}
              <div className="flex-1 flex justify-center">
                <div className="w-1 h-8 bg-white/5 rounded-full" />
              </div>

              <div className="flex gap-2">
                <Seat
                  number={rowIndex * 4 + 3}
                  isBooked={bookedSeats.includes(rowIndex * 4 + 3)}
                  isSelected={selectedSeats.includes(rowIndex * 4 + 3)}
                  onClick={() => onSeatToggle(rowIndex * 4 + 3)}
                />
                <Seat
                  number={rowIndex * 4 + 4}
                  isBooked={bookedSeats.includes(rowIndex * 4 + 4)}
                  isSelected={selectedSeats.includes(rowIndex * 4 + 4)}
                  onClick={() => onSeatToggle(rowIndex * 4 + 4)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-12 flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-stone-500 border-t border-white/5 pt-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white/5 border border-white/10 rounded-sm" />
            <span>متاح</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-sm shadow-lg shadow-emerald-500/20" />
            <span>مختار</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-stone-800 rounded-sm" />
            <span>محجوز</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Seat({
  number,
  isBooked,
  isSelected,
  onClick,
}: {
  number: number;
  isBooked: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  if (number > 49) return null;

  return (
    <motion.button
      whileHover={!isBooked ? { scale: 1.1, y: -2 } : {}}
      whileTap={!isBooked ? { scale: 0.95 } : {}}
      disabled={isBooked}
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center transition-all relative group overflow-hidden",
        isBooked
          ? "bg-stone-800 text-stone-600 cursor-not-allowed"
          : isSelected
          ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/40"
          : "bg-white/5 border border-white/10 text-stone-400 hover:border-emerald-500/50 hover:bg-emerald-500/5"
      )}
    >
      <Armchair className={cn("w-6 h-6 z-10", isSelected ? "text-white" : "text-inherit")} />
      
      {/* Seat Number Badge */}
      <span className="absolute top-1 right-1 text-[8px] font-black opacity-30">
        {number}
      </span>

      {/* Hover Glow */}
      {!isBooked && !isSelected && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </motion.button>
  );
}
