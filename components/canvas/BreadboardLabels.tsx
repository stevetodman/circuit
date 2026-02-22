'use client';

import { Text } from '@react-three/drei';
import {
  PITCH,
  COLS,
  ROWS,
  BOARD_TOP_Y,
  rowZTop,
  rowZBot,
  RAIL_GAP,
} from '@/constants/breadboard';

const LABEL_Y = BOARD_TOP_Y - 0.13;
const ROW_LABEL_OFFSET_X = -0.15;
const LABEL_COLOR = '#555577';
const ROW_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
const COLUMN_INDICES = [0, 4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59];
const COLUMN_Z_OFFSET = 0.15;

const COL_X = (col: number): number => (col - (COLS - 1) / 2) * PITCH;
const ROW_Z = (rowIndex: number): number => {
  if (rowIndex < ROWS) return rowZTop(rowIndex);
  return rowZBot(rowIndex - ROWS);
};

export default function BreadboardLabels() {
  const leftOfBoardX = COL_X(0) + ROW_LABEL_OFFSET_X;
  const bottomOfBoardZ = rowZBot(ROWS - 1) + RAIL_GAP + PITCH * 2.2;

  return (
    <group>
      {ROW_LABELS.map((label, rowIndex) => (
        <Text
          key={`row-${label}`}
          position={[leftOfBoardX, LABEL_Y, ROW_Z(rowIndex)]}
          fontSize={0.09}
          color={LABEL_COLOR}
          anchorX="right"
          anchorY="middle"
        >
          {label}
        </Text>
      ))}

      {COLUMN_INDICES.map((colIndex) => (
        <Text
          key={`col-${colIndex}`}
          position={[COL_X(colIndex), LABEL_Y, bottomOfBoardZ + COLUMN_Z_OFFSET]}
          fontSize={0.08}
          color={LABEL_COLOR}
          anchorX="center"
          anchorY="middle"
        >
          {String(colIndex + 1)}
        </Text>
      ))}
    </group>
  );
}
