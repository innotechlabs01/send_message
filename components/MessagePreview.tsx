'use client';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface DatosPrevia {
  nombreDestinatario: string;
  nombreRemitente: string;
  textoBase: string;
  fechaEnvio?: string;
  celularDestinatario?: string;
}

interface MessagePreviewProps {
  abierto: boolean;
  datos: DatosPrevia;
  onCerrar: () => void;
  onAceptar: (textoFinal: string) => void;
}

function enmascararCelular(cel: string): string {
  if (!cel || cel.length < 4) return '******';
  return `******${cel.slice(-4)}`;
}

function construirMensaje(datos: DatosPrevia): string {
  const texto = datos.textoBase
    .replace(/\{destinatario\}/gi, datos.nombreDestinatario)
    .replace(/\{remitente\}/gi, datos.nombreRemitente);

  return `Hola ${datos.nombreDestinatario}\n\n${texto}\n\nEste mensaje es enviado por ${datos.nombreRemitente}`;
}

export default function MessagePreview({ abierto, datos, onCerrar, onAceptar }: MessagePreviewProps) {
  const textoFinal = construirMensaje(datos);
  const partes = textoFinal.split('\n\n');

  const encabezado = partes[0] ?? '';
  const cuerpo = partes.slice(1, -1).join('\n\n');
  const pie = partes[partes.length - 1] ?? '';

  const handleAceptar = () => {
    // Guardar texto final en sessionStorage
    const datos_envio = JSON.parse(sessionStorage.getItem('datos_envio') ?? '{}');
    sessionStorage.setItem('datos_envio', JSON.stringify({ ...datos_envio, texto_final: textoFinal }));
    onAceptar(textoFinal);
  };

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Vista previa del mensaje">
      <div className="space-y-5">
        {/* Mensaje con tres secciones */}
        <div
          className="bg-[#ECECEC] border border-[#CCCCCC] rounded-xl shadow-sm p-5 space-y-3"
          aria-label="Vista previa del mensaje"
        >
          {/* Encabezado */}
          <p className="font-semibold text-[#333333] text-sm">{encabezado}</p>

          {/* Cuerpo */}
          {cuerpo && (
            <p className="text-[#333333] text-sm leading-relaxed whitespace-pre-line border-t border-[#CCCCCC] pt-3">
              {cuerpo}
            </p>
          )}

          {/* Pie */}
          <p className="text-[#666666] text-xs italic border-t border-[#CCCCCC] pt-3">{pie}</p>
        </div>

        {/* Datos de envío */}
        <div className="bg-white border border-[#CCCCCC] rounded-lg p-4 space-y-2 text-sm">
          {datos.fechaEnvio && (
            <div className="flex justify-between">
              <span className="text-[#666666]">Fecha de envío:</span>
              <span className="font-medium text-[#333333]">
                {(() => {
                  const [year, month, day] = datos.fechaEnvio.split('-').map(Number);
                  const fecha = new Date(year, month - 1, day);
                  return fecha.toLocaleDateString('es-CO', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  });
                })()}
              </span>
            </div>
          )}
          {datos.celularDestinatario && (
            <div className="flex justify-between">
              <span className="text-[#666666]">Destinatario:</span>
              <span className="font-medium text-[#333333]">
                {enmascararCelular(datos.celularDestinatario)}
              </span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          <Button variante="secondary" onClick={onCerrar} className="flex-1">
            Modificar
          </Button>
          <Button variante="primary" onClick={handleAceptar} className="flex-1">
            Aceptar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
