"use client";

import { useState } from "react";

export function MasterUploadField({ label }: { label: string }) {
  const [convert, setConvert] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <div className="masterUploadField">
      <span className="masterUploadLabel">{label}</span>
      <div className="masterUploadChoices" role="group" aria-label="Formato do master">
        <label className={convert ? "masterUploadChoice" : "masterUploadChoice isSelected"}>
          <input type="radio" name="convertMasterToFlac" value="no" checked={!convert} onChange={() => { setConvert(false); setFileError(null); }} />
          <span>Já tenho FLAC</span>
        </label>
        <label className={convert ? "masterUploadChoice isSelected" : "masterUploadChoice"}>
          <input type="radio" name="convertMasterToFlac" value="yes" checked={convert} onChange={() => { setConvert(true); setFileError(null); }} />
          <span>Converter para FLAC</span>
        </label>
      </div>
      <label className="masterUploadFile">
        <span>{convert ? "Selecione o áudio original" : "Selecione o arquivo FLAC"}</span>
        <input
          key={convert ? "convert" : "flac"}
          name="master"
          type="file"
          accept={convert ? ".wav,.aif,.aiff,.mp3,.m4a,.aac,.flac" : "audio/flac,.flac"}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            const extension = file?.name.slice(file.name.lastIndexOf(".")).toLowerCase();
            const allowed = convert
              ? [".wav", ".aif", ".aiff", ".mp3", ".m4a", ".aac", ".flac"]
              : [".flac"];
            const error = file && file.size > 200 * 1024 * 1024
              ? "O áudio deve ter no máximo 200 MB."
              : file && !allowed.includes(extension ?? "")
                ? "Selecione um formato de áudio aceito nesta opção."
                : null;
            event.currentTarget.setCustomValidity(error ?? "");
            setFileError(error);
          }}
        />
      </label>
      {fileError ? <small className="masterUploadError" role="alert">{fileError}</small> : null}
      <small>Arquivo FLAC obrigatório para a entrega oficial.</small>
      {convert ? (
        <small className="masterUploadNotice">
          Aceita WAV, AIFF, MP3, M4A e AAC até 200 MB. A Tunix converte antes de salvar o master.
          Prefira áudio estéreo de 16 ou 24 bits, com pelo menos 44,1 kHz. Converter MP3 ou AAC para FLAC não recupera a qualidade perdida no arquivo original.
        </small>
      ) : null}
    </div>
  );
}
