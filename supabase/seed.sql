-- Seed: Categorías
INSERT INTO categorias (nombre, icono) VALUES
  ('Cumpleaños', '🎂'),
  ('Graduación', '🎓'),
  ('Aniversario', '💍'),
  ('Luto', '🕊️'),
  ('Amor', '❤️');

-- Seed: Mensajes Cumpleaños (20 mensajes)
INSERT INTO mensajes_prediseniados (categoria_id, texto)
SELECT id, msg FROM categorias, (VALUES
  ('es súper importante que sepas que este nuevo año te abrazara con alegrías, salud y sueños cumplidos por toneladas. ¡Feliz cumpleaños!'),
  ('Un día como hoy, el mundo recibió un regalo en forma de tu existencia y nosotros felices de poder tenerte cerca y compartir siempre contigo. Que tengas un día lleno de amor y luz.'),
  ('Que cada velita encendida hoy represente una razón más para sonreír, para que tengas a la mano todas las herramientas que sean requeridas para que cumplas todos tus sueños y deseos. ¡Felicidades!'),
  ('¡Feliz vuelta al sol! Que cada instante de este nuevo ciclo en tu vida esté lleno de grandes propósitos cumplidos y miles de alegrías.'),
  ('Tu presencia, tu sonrisa, tu forma de ser, hace especial el mundo que te rodea. Gracias por existir. ¡Feliz cumpleaños!'),
  ('Hoy celebramos tu nacimiento, tu vida, tu historia y todo lo que estás por conquistar. ¡Brindo por ti, por tus sueños y tu futuro!'),
  ('Que este cumpleaños te traiga nuevas pasiones, nuevos caminos y muchos logros, abrazos sinceros y momentos inolvidables.'),
  ('Que el amor siempre te encuentre en cada rincón de donde quiera que te encuentres de este día tan especial. ¡Feliz cumpleaños!'),
  ('Tu luz es gran inspiración para quienes te rodean. Te deseamos que sigas brillando siempre y cumplas todos tus sueños. ¡Feliz cumpleaños!'),
  ('Para ti hoy un nuevo año comienza, una nueva oportunidad para soñar, sentir, para amar y crecer. ¡Felicidades!'),
  ('Que la vida te sorprenda siempre con regalos que no se envuelven, pero se sienten y valen más que el oro y se atesoran en el corazón. ¡Feliz cumpleaños!'),
  ('En tu día, celebro tu existencia con alegría, recuerdos hermosos, respeto y muchísimo cariño. ¡Disfruta tu día al máximo!'),
  ('Gracias por ser parte de mi historia por acompañarme en mi camino. Hoy, deseo que el universo te regale paz y plenitud. ¡Feliz cumpleaños!'),
  ('Cada cumpleaños es un recordatorio de lo valioso y especial que eres en nuestras vidas. Que este sea inolvidable.'),
  ('Tu presencia y energía transforma cada momento. Hoy celebramos tu nacimiento y deseamos grandes éxitos. ¡Feliz cumpleaños!'),
  ('Que tu nuevo año esté bordado de risas, aprendizajes, alegrías y sueños cumplidos. ¡Felicidades!'),
  ('Las estrellas brillan hoy especialmente para ti, te recargan de energía para que seas feliz. ¡Feliz cumpleaños!'),
  ('Tú eres un gran regalo que no necesita envoltura. Que este día sea tan especial como tú y estés rodeado de todos tus seres amados. ¡Felicidades!'),
  ('Que el calendario hoy en tu día te regale más momentos dulces que días amargos, más aciertos que desaciertos y muchas alegrías. ¡Felices nuevos comienzos!'),
  ('Un abrazo desde el corazón para quien merece siempre lo mejor, que hoy en tu día todos tus sueños se cumplan. ¡Feliz cumpleaños!')
) AS t(msg) WHERE categorias.nombre = 'Cumpleaños';

-- Seed: Mensajes Graduación (20 mensajes)
INSERT INTO mensajes_prediseniados (categoria_id, texto)
SELECT id, msg FROM categorias, (VALUES
  ('Hoy con tu grado cierras un capítulo increíble y nos sentimos felices de compartir este momento contigo, a partir de mañana comienzas un capítulo aún mejor y un gran camino para tu vida. ¡Felicidades por tu logro!'),
  ('Tu esfuerzo florece e inicia a dar frutos a partir de este momento. Te deseamos que lo que viene sea aún más brillante para ti. ¡Enhorabuena!'),
  ('Cada trasnocho, cada paso que diste te trajo hoy aquí a celebrar. Que nunca se apaguen tus ganas de aprender. ¡Felicidades!'),
  ('Graduarte no solo es terminar algo: es demostrar de lo que estás hecho y de lo mucho que eres capaz, hoy nos sentimos orgullosos de ti. ¡Felicidades por tu logro!'),
  ('Que la emoción y la alegría de este día te recuerde que todo lo que soñaste es posible. Continúa soñando y materializa cada uno de ellos. ¡Felicidades!'),
  ('¡Felicidades! Hoy celebramos tu constancia, tu disciplina, tu dedicación, tu luz y te acompañamos a recibir la recompensa. ¡Felicidades por tu grado!'),
  ('Este logro es tuyo y de todos los que te apoyaron en el camino, familiares y amigos. ¡Felicidades por este gran logro!'),
  ('Con tu grado dejas hermosas huellas y abres grandes caminos. El futuro será tu lienzo. ¡A pintarlo con pasión!'),
  ('Tu diploma es el símbolo de tu grado y de tu dedicación, pero tu crecimiento es el verdadero premio. ¡Adelante y muchas felicidades!'),
  ('Todo lo que aprendiste durante tu carrera ya vive en ti. Ahora úsalo para cambiar y mejorar el mundo. ¡Felicidades por tu logro!'),
  ('Tu esfuerzo merece cada aplauso, cada palabra de admiración y cada buen deseo de éxito. ¡Disfruta esta victoria al máximo, Felicidades!'),
  ('La vida siempre te espera con nuevos retos. Pero hoy, solo déjate abrazar por tu logro y el amor de las personas que te rodean. ¡Feliz graduación!'),
  ('Tu historia se escribe con valentía y determinación. Hoy celebramos un capítulo épico y materialización del camino que recorres. ¡Felicidades por tu logro!'),
  ('Tu grado más que una meta alcanzada, es un nuevo camino que se abre a grandes éxitos. ¡Qué bello verte crecer. Felicidades!'),
  ('El mundo necesita tu talento, tu personalidad, tu humanidad. Este título es solo el comienzo. ¡Ve con todo. Felicidades por tu grado!'),
  ('Hoy es el reflejo de todo lo que superaste y de todo lo que puedes lograr. ¡Felicitaciones y nunca olvides lo capaz que eres!'),
  ('Lo hiciste. Con lágrimas, risas y mucho café. Y aquí estás, brillando y cumpliendo tus logros y sueños. ¡Felicidades por tu logro!'),
  ('Que cada logro futuro te recuerde lo que celebramos hoy y cumplas con la promesa de ser un buen profesional y mejorar con tu profesión el mundo. ¡Felicitaciones!'),
  ('Tu éxito inspira y motiva. Gracias por mostrar que los sueños, con esfuerzo y disciplina, sí se cumplen. ¡Felicidades por tu logro!'),
  ('Alza la mirada al horizonte y disfruta lo que ves, respira hondo y sonríe. Has llegado… y apenas comienzas. ¡Felicidades por tu logro!')
) AS t(msg) WHERE categorias.nombre = 'Graduación';

-- Seed: Mensajes Aniversario (20 mensajes)
INSERT INTO mensajes_prediseniados (categoria_id, texto)
SELECT id, msg FROM categorias, (VALUES
  ('Cada día contigo es un regalo, una bendición, pero hoy celebramos el más valioso de todos: nuestro amor y compromiso de vida. Feliz aniversario.'),
  ('El tiempo pasa muy rápido, pero lo que siento por ti solo crece aún más y más. Gracias por compartir y estar en este viaje conmigo. Feliz aniversario.'),
  ('Un aniversario más para recordarte que sigues siendo mi persona favorita contemplada y amada, un aniversario más y yo te deseo cada día más. Feliz aniversario.'),
  ('Tu compañía durante todo este tiempo juntos, sigue siendo mi refugio, mi alegría y mi fortaleza, me llenas de motivos para luchar cada día y amarte cada vez más. ¡Feliz aniversario!'),
  ('Amar y ser amado por ti ha sido mi mayor aventura llena de emociones. Solo deseo que vengan muchos años más de esas hermosas aventuras que atesoraré toda mi vida.'),
  ('Hoy celebramos lo que hemos decidido construir: amor, confianza, compromiso y memorias eternas. Feliz aniversario.'),
  ('Cada aniversario es un recordatorio de lo afortunado que soy por tenerte.'),
  ('Nuestro amor no necesita palabras… pero hoy quiero decirte que es lo más bello que tengo.'),
  ('Entre abrazos y silencios, nuestro vínculo se hace cada vez más fuerte. ¡Feliz aniversario!'),
  ('Gracias por caminar a mi lado con ternura y convicción. Brindo por todo lo que aún nos espera.'),
  ('Nuestro amor no se mide en años, sino en momentos compartidos. Gracias por tantos instantes inolvidables.'),
  ('Qué bonito es mirar atrás y ver que siempre hemos estado del mismo lado.'),
  ('Este aniversario me recuerda cuánta magia hay en lo cotidiano contigo.'),
  ('No importa cuántas veces celebre este día… cada vez me emociona como la primera.'),
  ('Nuestra historia merece celebrarse en voz alta. ¡Felicidades por este amor que crece!'),
  ('Tu amor es mi hogar. Hoy celebramos que seguimos construyéndolo juntos.'),
  ('Nuestro vínculo está tejido de paciencia, cariño y aventuras compartidas. ¡Feliz aniversario!'),
  ('Hoy celebro que existimos, que resistimos, y que seguimos eligiéndonos cada día.'),
  ('Este aniversario es prueba de que lo verdadero perdura y se fortalece.'),
  ('Gracias por cada mirada cómplice, por cada paso compartido. ¡Por muchos más aniversarios!')
) AS t(msg) WHERE categorias.nombre = 'Aniversario';

-- Seed: Mensajes Luto (20 mensajes)
INSERT INTO mensajes_prediseniados (categoria_id, texto)
SELECT id, msg FROM categorias, (VALUES
  ('Acompaño tu dolor con respeto y silencio. Que encuentres consuelo en los recuerdos compartidos.'),
  ('No hay palabras suficientes, solo un corazón que se une al tuyo en este momento difícil.'),
  ('Que la paz te abrace mientras honras la memoria de quien tanto significó.'),
  ('Su luz sigue viva en cada gesto, en cada recuerdo. Un abrazo sincero en tu duelo.'),
  ('Que el amor que rodea tu pérdida te sostenga en los días más nublados.'),
  ('Aunque no esté físicamente, su esencia vive en quienes lo amaron.'),
  ('Que cada lágrima que brota sea también un homenaje al amor que no se olvida.'),
  ('Te acompaño con todo mi respeto. Que el tiempo sane sin borrar lo vivido.'),
  ('Su partida deja un silencio profundo, pero también un legado de amor.'),
  ('El duelo es la forma más sincera en que el amor se manifiesta cuando perdemos.'),
  ('A veces el corazón necesita espacio para simplemente sentir. Aquí estoy contigo.'),
  ('Que encuentres fortaleza en los gestos de quienes te rodean con cariño.'),
  ('Recordar a quien partió es la manera más bonita de seguir amándolo.'),
  ('Nada ni nadie podrá quitarte lo compartido. Ese vínculo permanece eterno.'),
  ('Tu dolor merece ser escuchado y abrazado. Mi pensamiento está contigo.'),
  ('El alma que se va deja huellas que el tiempo no borra.'),
  ('La ausencia duele, pero también revela cuán profundo fue el vínculo.'),
  ('En medio del duelo, que el amor recibido te sostenga.'),
  ('Que el recuerdo se vuelva luz. Que el dolor se vuelva pausa. Que la vida continúe con cariño.'),
  ('Tu pérdida es compartida desde lo más humano. Aquí estoy, contigo, en silencio y solidaridad.')
) AS t(msg) WHERE categorias.nombre = 'Luto';

-- Seed: Mensajes Amor (20 mensajes)
INSERT INTO mensajes_prediseniados (categoria_id, texto)
SELECT id, msg FROM categorias, (VALUES
  ('Amarte es descubrir un mundo nuevo en cada mirada tuya.'),
  ('Tu presencia hace que todo lo cotidiano se vuelva extraordinario.'),
  ('El amor contigo no tiene horarios, solo instantes eternos.'),
  ('Tu voz es el lugar donde mi corazón siempre quiere volver.'),
  ('No sé si existe el destino, pero contigo cada coincidencia se siente perfecta.'),
  ('Te pienso y todo se pinta de colores cálidos y sinceros.'),
  ('Lo más bonito que me pasó... fue cruzarme contigo.'),
  ('Estás en mi mente, mi piel, y en cada suspiro que no sé cómo explicar.'),
  ('Contigo el tiempo no corre, se queda contemplando.'),
  ('Eres el mensaje que mi alma siempre quiso leer.'),
  ('No quiero promesas, solo seguir escribiendo contigo cada capítulo.'),
  ('Amarte es fácil, pero entender todo lo que siento es otra historia.'),
  ('Hay abrazos que curan. El tuyo es uno de ellos.'),
  ('Eres hogar, aunque no estemos en el mismo lugar.'),
  ('Tu amor me hizo entender que lo verdadero no se grita, se siente.'),
  ('No necesito mil palabras cuando con una mirada me lo dices todo.'),
  ('A veces, el mejor plan es simplemente estar juntos sin hacer nada.'),
  ('Entre todos los caminos, el tuyo siempre será mi favorito.'),
  ('Gracias por ser tú. Así, sin filtros.'),
  ('Si pudiera enredarme en tus pensamientos, me quedaría a vivir ahí.')
) AS t(msg) WHERE categorias.nombre = 'Amor';
