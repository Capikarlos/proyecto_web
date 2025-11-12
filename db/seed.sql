-- 1. Añade la columna para vincularla con el usuario
ALTER TABLE public.contacto
ADD COLUMN usuario_id INTEGER;

-- 2. (Opcional) Hace que el correo no sea obligatorio si el usuario_id está presente
-- Lo dejamos como NOT NULL por ahora, ya que el formulario lo pide

-- 3. Crea la llave foránea
ALTER TABLE public.contacto
ADD CONSTRAINT fk_usuario_contacto
FOREIGN KEY (usuario_id)
REFERENCES public.usuarios (id)
ON DELETE SET NULL; -- Si se borra el usuario, el comentario queda como anónimo